const xml = require("xml")
const crypt = require('crypto')

const date = new Date()

function content() {
    return 'UNSIGNED-PAYLOAD'
}

function datetime() {
    return date.toISOString().replace(/[:\-]|\.\d{3}/g, '')
}

function sign(key, text) {
    return crypt.createHmac('sha256', key).update(text).digest()
}

function auth(uri, query) {
    const access_key_id = process.env.S3_ACCESS_KEY_ID
    const secret_access_key = process.env.S3_SECRET_ACCESS_KEY
    if (access_key_id && secret_access_key) {
        const service = 's3'
        const algorithm = 'AWS4-HMAC-SHA256'
        const request_type = 'aws4_request'
        const host = process.env.S3_ENDPOINT.split('//')[1]
        const region = process.env.S3_REGION
        const bucket = process.env.S3_BUCKET
        const signed_headers = 'host;x-amz-content-sha256;x-amz-date'
        const canonical_request = [
            'GET', `/${bucket}${uri}`, query,
            `host:${host}`, `x-amz-content-sha256:${content()}`, `x-amz-date:${datetime()}`, '', signed_headers, content()
        ].join('\n')
        const credential_scope = `${datetime().split('T')[0]}/${region}/${service}/${request_type}`
        const string_to_sign = [
            algorithm, datetime(), credential_scope, crypt.createHash('sha256').update(canonical_request).digest('hex')
        ].join('\n')
        const signing_key = sign(sign(sign(sign(`AWS4${secret_access_key}`, datetime().split('T')[0]), region), service), request_type)
        const signature = crypt.createHmac('sha256', signing_key).update(string_to_sign).digest('hex')
        return `${algorithm} Credential=${access_key_id}/${credential_scope}, SignedHeaders=${signed_headers}, Signature=${signature}`
    } else {
        return ''
    }
}

function authorization(request) {
    return auth(request.uri, '')
}

async function directory(request) {
    const path = request.uri.substring(1), directories = [], files = []
    let token = ''
    do {
        try {
            const continuation = token ? `continuation-token=${token.replaceAll('=','%3D')}&` : ''
            const query = `${continuation}delimiter=/&list-type=2&prefix=${path}`.replaceAll('/','%2F')
            const data = await ngx.fetch(`${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}?${query}`, { headers: {
                'X-Amz-Content-Sha256': content(),
                'X-Amz-Date': datetime(),
                'Authorization': auth('', query)
            }})
            const text = await data.text()
            token = ''
            xml.parse(text).ListBucketResult.$tags.forEach(tag => {
                switch (tag.$name) {
                    case 'CommonPrefixes':
                        directories.push(tag.$tags
                            .map(function (subtag) {
                                const directory = subtag.$text.replace(path, '').replaceAll('%2F','/')
                                return `<a href="${directory}">${directory}</a>`
                            }))
                        break
                    case 'Contents':
                        const file = {}
                        tag.$tags.forEach(subtag => {
                            switch (subtag.$name) {
                                case 'Key':
                                    file.name = subtag.$text.replace(path, '').replaceAll('%2F','/')
                                    break
                                case 'Size':
                                    file.size = subtag.$text
                                    break
                                case 'LastModified':
                                    file.time = subtag.$text.replace('T', ' ').replace('Z', '')
                                    break
                            }
                        })
                        const spaces = ' '.repeat(120 - file.name.length)
                        files.push(`<a href="${file.name}">${file.name}</a>${spaces}${file.time}  ${file.size}`)
                        break
                    case 'NextContinuationToken':
                        token = tag.$text
                        break
                }
            })
        } catch (error) {
            request.error(`DIRECTORY LISTING ERROR: ${error}`)
        }
    } while (token)
    request.headersOut['Content-Type'] = 'text/html'
    const begin = `<html><head><title>Index of ${request.uri}</title></head><body>Index of ${request.uri}<hr><pre><a href="../">../</a>`
    const end = '</pre><hr></body></html>'
    request.return(200, `${begin}\n${directories.join('\n')}\n${files.join('\n')}\n${end}\n`)
}

export default { content, datetime, authorization, directory }
