*** Settings ***
Documentation  Shopping
Resource       common.resource


*** Keywords ***
Shop For Tools
    [Documentation]    Shop for a set of tools
    [Tags]    shopping
    [Arguments]    ${user}    ${search}    ${tool}    ${quantity}=1

    Goto Home Page
    Search Product    ${search}
    # Verify Product Data
    Order Product    ${tool}    ${quantity}
    Goto Shopping Cart
    Step 1 Cart  ${tool}    ${quantity}
    Step 2 Sign In    ${user}
    Step 3 Billing Address    ${user}
    Step 4 Payment    ${user}

Search Product
    [Documentation]    Seach for a specific tool product
    [Tags]  search
    [Arguments]    ${search}

    # Search for a tool
    ${l_search}    Get Element By Role    textbox    name=Search    exact=true
    Type Text    ${l_search}    ${search}    delay=${TYPE_SPEED}

    # click search button
    ${l_button}    Get Element By Role    button    name=Search    exact=true
    Click    ${l_button}

    # Heading gets updated
    Get Element By Role    heading    name=Searched for: ${search}

Verify Product Data
    [Documentation]  Verify currently displayed product data

    @{products}  Create List
    @{l_products}  Get Elements    xpath=//a[@class='card']
    FOR    ${product}    IN    @{l_products}
        ${title}  Get Text  ${product} >> //h5
        ${price}  Get Text  ${product} >> css=.card-footer .float-end
        ${has_status}  Get Element States  ${product} >> css=.card-footer .float-start  then  bool(value & visible)

        VAR  ${product_status}
        IF  ${has_status}
            ${product_status}  Get Text  ${product} >> css=.card-footer .float-start
        END
        &{data}  Create Dictionary  name=${title}  price=${price}  status=${product_status}
        Append To List  ${products}  ${data}
    END

    # Load list of products from JSON
    ${product_list}    Evaluate    ${PRODUCT_LIST}
    Verify Lists Of Dictionaries Equal  ${products}  ${product_list}

Order Product
    [Documentation]
    ...    Order a product:
    ...    * select a product by name
    ...    * goto the product page
    ...    * set quantity to order
    ...    * add to shopping cart
    [Arguments]    ${tool}    ${quantity}

    # Select the product by name
    ${product}    Get Element By Role    heading    name=${tool}
    Click    ${product}

    # Verify correct product page
    Get Element By Role    heading    name=${tool}

    # Set quantity to order
    ${l_quantity}    Get Element By Role    spinbutton    name=Quantity    exact=true
    Type Text    ${l_quantity}    ${quantity}    delay=${TYPE_SPEED}

    # Add product to cart
    ${l_addToCart}    Get Element By Role    button    name=Add to cart    exact=true
    Click    ${l_addToCart}

    # Wait for info message
    Get Element By Role    alert    name=Product added to shopping cart.

Goto Shopping Cart
    [Documentation]  Show Shopping Cart

    # Click in shopping cart
    ${l_cartLink}    Get Element By Role    link    name=cart    exact=true
    Click    ${l_cartLink}

Step 1 Cart
    [Documentation]    Show shopping cart
    [Tags]  cart
    [Arguments]    ${tool}    ${quantity}

    # Wait for shopping cart data to show
    Get Element By Role    cell    name=Total

    Verify Cart  ${tool}    ${quantity}

    ${l_button}    Get Element By Role    button    name=Proceed to checkout
    Click  ${l_button}

Verify Cart
    [Documentation]    Show shopping cart
    [Tags]  cart
    [Arguments]    ${tool}    ${quantity}

    ${rows}  Get Elements  xpath=//table/tbody/tr
    FOR  ${row}  IN  @{rows}

      ${card_item}      Get Text  ${row} >> xpath=td[1]
      ${card_quantity}  Get Text  ${row} >> xpath=td[2]/input
      ${card_price}     Get Text  ${row} >> xpath=td[3]
      ${card_total}     Get Text  ${row} >> xpath=td[4]

      ${card_quantity}  Convert To Integer  ${card_quantity}
      ${card_price}     Evaluate    float("${card_price}".replace("$", ""))
      ${card_total}     Evaluate    float("${card_total}".replace("$", ""))

      ${expected_total}   Evaluate  ${card_price} * ${card_quantity}

      # Verify: product name quantity and total calculation
      Should Be Equal As Strings   ${card_item}   ${tool}  strip_spaces=True
      Should Be Equal As Integers  ${card_quantity}   ${quantity}  
      Should Be Equal As Numbers   ${card_total}  ${expected_total}  precision=2
    END

Step 2 Sign In
    [Documentation]    Sign In if required
    [Arguments]    ${user}

    # Verify: user name + last name
    Get Element By
    ...    text
    ...    text=Hello ${user.first_name} ${user.last_name}, you are already logged in. You can proceed to checkout.

    ${l_proceed}    Get Element By Role    button    name=Proceed to checkout
    Click    ${l_proceed}

Step 3 Billing Address
    [Documentation]    Show and update billing address
    [Tags]  billing
    [Arguments]    ${user}

    # Verify we are on billing address page
    Get Element By Role    heading    name=Billing Address

    # Verify billing address
    ${l_street}    Get Element By    Placeholder    text=Your street
    ${address}    Get Text    ${l_street}
    Should Be Equal    ${user.address}    ${address}

    ${l_city}    Get Element By    Placeholder    text=Your city
    ${city}    Get Text    ${l_city}
    Should Be Equal    ${user.city}    ${city}

    ${l_state}    Get Element By    Placeholder    text=State
    ${state}    Get Text    ${l_state}
    Should Be Equal    ${user.state}    ${state}

    ${l_country}    Get Element By    Placeholder    text=Your country
    ${country}    Get Text    ${l_country}
    Should Be Equal    ${user.country_code}    ${country}

    ${l_postcode}    Get Element By    Placeholder    text=Your postcode
    ${postcode}    Get Text    ${l_postcode}
    Should Be Equal    ${user.postcode}    ${postcode}

    ${l_proceed}    Get Element By Role    button    name=Proceed to checkout
    Click  ${l_proceed}

Step 4 Payment
    [Documentation]    Specify payments methods and settings
    [Tags]  payment
    [Arguments]    ${user}

    ${l_selector}    Get Element By Role    combobox    name=Payment Method
    Select Options By    ${l_selector}    text    ${user.method}

    ${l_selector}    Get Element By Role    combobox    name=Monthly Installments
    Select Options By    ${l_selector}    text    ${user.installments}

    ${l_confirmMethod}    Get Element By Role    button    name=Confirm
    Click    ${l_confirmMethod}

    ${l_selector}    Get Element By Role    combobox    name=Payment method
    Select Options By    ${l_selector}    text    ${user.payment}

    ${l_selector}    Get Element By Role    textbox    name=Bank Name
    Type Text    ${l_selector}    ${user.bank}

    ${l_selector}    Get Element By Role    textbox    name=Account Name
    Type Text    ${l_selector}    ${user.account_name}    delay=${TYPE_SPEED}

    ${l_selector}    Get Element By Role    textbox    name=Account Number
    Type Text    ${l_selector}    ${user.account_number}    delay=${TYPE_SPEED}

    # Verify: Payment was successful
    Get Element By    text    Payment was successful

    ${l_confirmPayment}    Get Element By Role    button    name=Confirm
    Click    ${l_confirmPayment}

    # Wait of alert message
    Get Element By    text    Thanks for your order! Your invoice number is INV-
