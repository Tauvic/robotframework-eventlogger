*** Settings ***
Documentation  Login
Resource       common.resource


*** Keywords ***
Fill Login Form
    [Documentation]    Fill in login form
    [Arguments]    ${user}

    # Verify User Login form is displayed
    Get Element By Role    heading    name=Login

    # Enter the correct email for the newly created user
    ${l_email}    Get Element By Role    textbox    name=Email address *    exact=true
    Type Text    ${l_email}    ${user["email"]}    delay=${TYPE_SPEED}

    # Enter the correct password for the newly created user
    ${l_password}    Get Element By Role    textbox    name=Password *    exact=true
    Type Text    ${l_password}    ${user["password"]}    delay=${TYPE_SPEED}

    # Click at the login button
    ${l_button}    Get Element By Role    button    name=Login    exact=true
    Click  ${l_button}

    # Verify: My account page is displayed
    Wait For Elements State
    ...    //h1[text()='My account']
    ...    visible
    ...    message=Error: Account Page not loaded

Login User
    [Documentation]    Login a user
    [Arguments]    ${user}
    Goto Home Page
    Goto Login Page
    Fill Login Form    ${user}

Register User
    [Documentation]    Register a new user
    [Arguments]    ${user}
    Goto Login Page

    # Click at the "register your account link"
    Click    text=Register your account

    # Verify: The Customer registration form is displayed
    Get Element By Role    heading    name=Customer registration

    GROUP    Fill Customer registration form
        # Get locators for this form
        ${l_first_name}    Get Element By Role    textbox    name=First name    exact=true
        ${l_last_name}    Get Element By Role    textbox    name=Last name    exact=true
        ${l_date_of_birth}    Get Element By Role    textbox    name=Date of Birth
        ${l_address}    Get Element By Role    textbox    name=Street    exact=true
        ${l_postcode}    Get Element By Role    textbox    name=Postal code    exact=true
        ${l_city}    Get Element By Role    textbox    name=City    exact=true
        ${l_state}    Get Element By Role    textbox    name=State    exact=true
        ${l_country}    Get Element By Role    combobox    name=Country    exact=true
        ${l_phone}    Get Element By Role    textbox    name=Phone    exact=true
        ${l_email}    Get Element By Role    textbox    name=Email address    exact=true
        ${l_password}    Get Element By Role    textbox    name=Password    exact=true

        # Fill in form
        Type Text    ${l_first_name}    ${user["first_name"]}    delay=${TYPE_SPEED}
        Type Text    ${l_last_name}    ${user["last_name"]}    delay=${TYPE_SPEED}
        Type Text    ${l_date_of_birth}    ${user["date_of_birth"]}    delay=${TYPE_SPEED}
        Type Text    ${l_address}    ${user["address"]}    delay=${TYPE_SPEED}
        Type Text    ${l_postcode}    ${user["postcode"]}    delay=${TYPE_SPEED}
        Type Text    ${l_city}    ${user["city"]}    delay=${TYPE_SPEED}
        Type Text    ${l_state}    ${user["state"]}    delay=${TYPE_SPEED}
        Select Options By    ${l_country}    label    ${user["country"]}
        Type Text    ${l_phone}    ${user["phone"]}    delay=${TYPE_SPEED}
        Type Text    ${l_email}    ${user["email"]}    delay=${TYPE_SPEED}
        Type Text    ${l_password}    ${user["password"]}    delay=${TYPE_SPEED}
    END

    # Click at the "Register" button
    ${l_button}    Get Element By Role    button    name=Register    exact=true
    Click    ${l_button}

    # Check for any alerts and errors after background service has been called
    # Check Alerts    xpath=//div[contains(@class, 'alert-danger')]

    Fill Login Form    ${user}
