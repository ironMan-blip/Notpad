import base64
import json
import urllib.request
import urllib.error
from typing import Tuple, Dict, Any
from fastapi import HTTPException
from app.core.config import settings

def parse_uploadthing_token(token: str) -> Tuple[str, str]:
    """Decodes the UPLOADTHING_TOKEN base64 string to extract apiKey and appId.
    If the token starts with 'sk_', returns it directly as apiKey with appId=None.
    """
    token_stripped = token.strip()
    if token_stripped.startswith("sk_"):
        return token_stripped, None

    try:
        # Strip whitespace and pad base64 token if needed
        padding = len(token_stripped) % 4
        if padding:
            token_stripped += "=" * (4 - padding)
        decoded = base64.b64decode(token_stripped).decode("utf-8")
        data = json.loads(decoded)
        apiKey = data.get("apiKey")
        appId = data.get("appId")
        if not apiKey:
            raise ValueError("Token must contain apiKey field")
        return apiKey, appId
    except Exception as e:
        # Fallback to returning token directly if base64 decoding fails
        return token_stripped, None

def get_presigned_url_sync(file_name: str, file_type: str, file_size: int) -> Dict[str, Any]:
    """Requests a presigned upload URL from UploadThing API (synchronous)."""
    token = settings.uploadthing_token
    if not token:
        raise HTTPException(
            status_code=500,
            detail="UPLOADTHING_TOKEN is not configured on the server."
        )

    apiKey, appId = parse_uploadthing_token(token)

    url = "https://api.uploadthing.com/v7/prepareUpload"
    headers = {
        "content-type": "application/json",
        "x-uploadthing-version": "7.7.4"
    }
    
    if apiKey:
        headers["x-uploadthing-api-key"] = apiKey
    
    # If the token is a unified token (not raw API key starting with sk_), pass authorization header
    if not token.strip().startswith("sk_"):
        headers["authorization"] = f"Bearer {token.strip()}"

    payload = {
        "fileName": file_name,
        "fileType": file_type,
        "fileSize": file_size,
        "acl": "public-read"
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            
            # The prepareUpload v7 response is a dictionary containing 'url' and 'key'
            if not isinstance(res_data, dict) or "url" not in res_data:
                raise HTTPException(
                    status_code=500,
                    detail="Invalid response format from UploadThing API"
                )
            
            key = res_data.get("key") or res_data.get("fileKey")
            if not key:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to retrieve key from UploadThing prepareUpload response."
                )
            
            # If appId was not decoded from the base64 token, extract it from the URL's query parameters
            if not appId:
                from urllib.parse import urlparse, parse_qs
                parsed_url = urlparse(res_data["url"])
                query_params = parse_qs(parsed_url.query)
                ut_identifiers = query_params.get("x-ut-identifier")
                if ut_identifiers:
                    appId = ut_identifiers[0]
            
            if not appId:
                raise HTTPException(
                    status_code=500,
                    detail="Could not resolve appId from UPLOADTHING_TOKEN or upload response."
                )
            
            # Construct standard CDN URL
            cdn_url = f"https://{appId}.ufs.sh/f/{key}"
            
            return {
                "url": res_data.get("url"),
                "fields": {},
                "fileKey": key,
                "cdnUrl": cdn_url
            }
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8")
        raise HTTPException(
            status_code=e.code,
            detail=f"UploadThing prepareUpload failed: {error_msg}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"UploadThing request failed: {str(e)}"
        )
