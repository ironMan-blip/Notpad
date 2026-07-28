import base64
import json
import urllib.request
import urllib.error
from typing import Tuple, Dict, Any
from fastapi import HTTPException
from app.core.config import settings

def parse_uploadthing_token(token: str) -> Tuple[str, str]:
    """Decodes the UPLOADTHING_TOKEN base64 string to extract apiKey and appId."""
    try:
        # Strip whitespace and pad base64 token if needed
        token_stripped = token.strip()
        padding = len(token_stripped) % 4
        if padding:
            token_stripped += "=" * (4 - padding)
        decoded = base64.b64decode(token_stripped).decode("utf-8")
        data = json.loads(decoded)
        apiKey = data.get("apiKey")
        appId = data.get("appId")
        if not apiKey or not appId:
            raise ValueError("Token must contain apiKey and appId fields")
        return apiKey, appId
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to decode UPLOADTHING_TOKEN: {str(e)}"
        )

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
        "x-uploadthing-api-key": apiKey,
        "content-type": "application/json",
        "authorization": f"Bearer {token}"
    }

    payload = {
        "files": [
            {
                "name": file_name,
                "type": file_type,
                "size": file_size,
            }
        ],
        "contentDisposition": "inline",
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
            if not isinstance(res_data, list) or len(res_data) == 0:
                raise HTTPException(
                    status_code=500,
                    detail="Invalid response format from UploadThing API"
                )
            
            # The prepareUpload response is a list matching the input files list
            file_info = res_data[0]
            
            # Construct standard CDN URL
            cdn_url = f"https://{appId}.ufs.sh/f/{file_info['fileKey']}"
            
            return {
                "url": file_info.get("url"),
                "fields": file_info.get("fields", {}),
                "fileKey": file_info.get("fileKey"),
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
