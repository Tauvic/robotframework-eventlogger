*** Settings ***
Documentation       Toolshop Learning (optional test cases for learning purposes)

Resource            common.resource
Resource            login.resource
Test Tags           experimental  #  robot:skip

*** Test Cases ***
TC01 Login or Register
    [Documentation]    Register a new customer if required
    TRY
        Login User    ${USER_NEW}
    EXCEPT    Error: Account locked *
        Fail
    EXCEPT    Error: Invalid email or password
        Register User    ${USER_NEW}
    END

TC02 Login Customer
    [Documentation]    Login a customer
    Login User    ${CUSTOMER}

# To Do: Add unblock account
