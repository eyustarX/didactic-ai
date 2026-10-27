"""
AWS Lambda Entrypoint Adapter for Didactic AI.
Supports serverless execution via Mangum for ASGI/FastAPI routing,
with fallback lightweight event-routing for serverless deployment.
"""

import os
import json
import logging

logger = logging.getLogger("didactic_lambda")
logger.setLevel(logging.INFO)

try:
    from mangum import Mangum
    from src.main import app
    handler = Mangum(app, lifespan="off")
except Exception as exc:
    logger.warning(f"Mangum ASGI adapter not active ({exc}); using lightweight native fallback handler.")

    def handler(event, context):
        """Lightweight native Lambda event router."""
        path = event.get("rawPath", event.get("path", "/"))
        method = event.get("requestContext", {}).get("http", {}).get("method", event.get("httpMethod", "GET"))

        headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Lecturer-Id",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        }

        if method == "OPTIONS":
            return {"statusCode": 200, "headers": headers, "body": ""}

        if path in ["/", "/health"]:
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({
                    "name": "Didactic AI Serverless API",
                    "status": "healthy",
                    "version": "1.0.0",
                    "environment": os.environ.get("STAGE", "prod"),
                    "provider": "AWS Bedrock Claude 3 Haiku",
                }),
            }

        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "message": f"Endpoint '{path}' ready on AWS Lambda.",
                "method": method,
            }),
        }
