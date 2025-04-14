*** Settings ***
Documentation       Toolshop Shopping
Library             DataDriver  ../resources/TS02_Shopping.csv
Resource            ../resources/shop.resource
Resource            ../resources/login.resource
Test Template       Search And Shop
Test Tags           login    shop


*** Test Cases ***
Search for ${search} and buy ${quantity} of ${tool}
    [Arguments]    ${search}    ${tool}    ${quantity}
    [Values]       search       tool       1


*** Keywords ***
Search And Shop
    [Documentation]  Data driven Shopping experience
    ...
    ...   Arguments:
    ...      - ${search}: Search to narrow the product range displayed (string)
    ...      - ${tool}: Name of the tool to buy (string)
    ...      - ${quantity}: Number of tools to buy (int)
    [Arguments]    ${search}   ${tool}  ${quantity}
    Login User    ${USER_NEW}
    Shop For Tools    user=${USER_NEW}    search=${search}    tool=${tool}    quantity=${quantity}
