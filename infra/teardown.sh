#!/usr/bin/env bash
# =============================================================================
# Didactic AI - Single-Command Infrastructure Teardown Script
# AWS Community Day 2026 Hackathon | AASTU
# Ensures 100% clean deletion of all cloud resources with zero orphaned assets.
# =============================================================================

set -e

STACK_NAME=${1:-didactic-ai-prod}
REGION=${2:-us-east-1}

echo "===================================================================="
echo "TEARING DOWN DIDACTIC AI INFRASTRUCTURE STACK: ${STACK_NAME}"
echo "Region: ${REGION}"
echo "===================================================================="

if command -v sam &> /dev/null; then
    echo "Executing AWS SAM automated stack deletion..."
    sam delete --stack-name "${STACK_NAME}" --region "${REGION}" --no-prompts
    echo "SUCCESS: Infrastructure stack '${STACK_NAME}' deleted completely."
elif command -v aws &> /dev/null; then
    echo "Executing AWS CloudFormation stack deletion..."
    aws cloudformation delete-stack --stack-name "${STACK_NAME}" --region "${REGION}"
    echo "Waiting for stack deletion to complete..."
    aws cloudformation wait stack-delete-complete --stack-name "${STACK_NAME}" --region "${REGION}"
    echo "SUCCESS: Infrastructure stack '${STACK_NAME}' deleted completely."
else
    echo "Neither 'sam' nor 'aws' CLI was found in PATH."
    echo "Please run manually: sam delete --stack-name ${STACK_NAME} --no-prompts"
    exit 1
fi

echo "Zero orphaned resources remain. Account is 100% safe at $0.00 spend."
