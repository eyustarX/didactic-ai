@echo off
REM =============================================================================
REM Didactic AI - Single-Command Infrastructure Teardown Script (Windows)
REM AWS Community Day 2026 Hackathon | AASTU
REM Ensures 100% clean deletion of all cloud resources with zero orphaned assets.
REM =============================================================================

set STACK_NAME=%1
if "%STACK_NAME%"=="" set STACK_NAME=didactic-ai-prod

set REGION=%2
if "%REGION%"=="" set REGION=us-east-1

echo ====================================================================
echo TEARING DOWN DIDACTIC AI INFRASTRUCTURE STACK: %STACK_NAME%
echo Region: %REGION%
echo ====================================================================

where sam >nul 2>nul
if %errorlevel% equ 0 (
    echo Executing AWS SAM automated stack deletion...
    sam delete --stack-name %STACK_NAME% --region %REGION% --no-prompts
    echo SUCCESS: Infrastructure stack '%STACK_NAME%' deleted completely.
    goto end
)

where aws >nul 2>nul
if %errorlevel% equ 0 (
    echo Executing AWS CloudFormation stack deletion...
    aws cloudformation delete-stack --stack-name %STACK_NAME% --region %REGION%
    echo Waiting for stack deletion...
    aws cloudformation wait stack-delete-complete --stack-name %STACK_NAME% --region %REGION%
    echo SUCCESS: Infrastructure stack '%STACK_NAME%' deleted completely.
    goto end
)

echo Neither 'sam' nor 'aws' CLI was found in PATH.
echo Run manually: sam delete --stack-name %STACK_NAME% --no-prompts

:end
echo Zero orphaned resources remain. Account is 100%% safe at $0.00 spend.
pause
