*** Settings ***
Documentation       Toolshop Login
Library             DataDriver  ../resources/TS03_Login.csv
Resource            ../resources/login.resource
Test Template       Login With User And Password
Test Tags           login


*** Test Cases ***
Login with user ${email} and password ${password} and expect message ${msgs}  email   password   msgs


*** Keywords ***
Login With User And Password
    [Documentation]  Data driven login test
    ...
    ...  Arguments:
    ...      - ${email}: email for loging (string)
    ...      - ${password}: password (string)
    ...      - ${msgs}: Expected result messages (string)
    ...
    ...    Note: **After multiple failures an account might get blocked**
    [Arguments]    ${email}    ${password}  ${msgs}
    &{user}  Create Dictionary  email=${email}  password=${password}
    Run Keyword And Expect Error
    ...    ${msgs}
    ...    Login User    ${user}
