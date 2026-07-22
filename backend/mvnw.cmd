@echo off
setlocal

set "MAVEN_VERSION=3.9.16"
set "MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%"
set "MAVEN_ZIP=%TEMP%\maven-%MAVEN_VERSION%.zip"

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
    echo [1/3] Downloading Maven %MAVEN_VERSION%...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://dlcdn.apache.org/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip' -OutFile '%MAVEN_ZIP%' -UseBasicParsing}"
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to download Maven. Trying mirror...
        powershell -Command "& {Invoke-WebRequest -Uri 'https://mirrors.aliyun.com/apache/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip' -OutFile '%MAVEN_ZIP%' -UseBasicParsing}"
    )
    echo [2/3] Extracting Maven...
    mkdir "%MAVEN_HOME%" 2>nul
    powershell -Command "Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%MAVEN_HOME%\..' -Force"
    del "%MAVEN_ZIP%" 2>nul
    echo [3/3] Maven %MAVEN_VERSION% ready.
)

set "PATH=%MAVEN_HOME%\bin;%PATH%"
echo Running: mvn %*
call mvn %*
endlocal