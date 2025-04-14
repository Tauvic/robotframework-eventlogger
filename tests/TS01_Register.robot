*** Settings ***
Documentation       Toolshop Registration
Resource            ../resources/login.resource


*** Test Cases ***
TC01 Register New User
    [Documentation]    Register a new user
    ...
    ...  Arguments:
    ...      ${user}: User profile data for loging (dictionary)
    ...
    ...    Note: **A new user can only be added once**
    [Tags]    register
    TRY
      Register User    ${USER_NEW}
    EXCEPT  	Error: A customer with this email address already exists.
      # Ignore because that is a functional error
      No Operation
    END
