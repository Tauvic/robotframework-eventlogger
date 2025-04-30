*** Settings ***
Documentation  Common variables and keywords
Library        Collections
Library        Browser    jsextension=${CURDIR}/EventLogger.js,${CURDIR}/throttle_network.js
...                       timeout=0:00:35  # auto_closing_level=KEEP
Library        EventLogger


*** Variables ***
${BASE_URL}             https://practicesoftwaretesting.com/
${BROWSER}              chromium       # chromium, webkit, firefox
${HEADLESS}             True

# Make test more realistic by setting the following variables
${TYPE_SPEED}           10ms         # simulated user typing speed
${SERVICE_TIMEOUT}      15s          # expected background service response time
${TRACING}              False        # enable browser tracing

# Network speed and CPU slowdown can only be specified for chromium
${NETWORK_SPEED}        "Standard"   # "Throttle Network Speed To Slow 3 G"
${CPU_SLOWDOWN}         1

&{USER_NEW}
...                     first_name=user1
...                     last_name=user1last name
...                     date_of_birth=10/10/1990
...                     address=Kobaltweg 11
...                     postcode=3542CE
...                     city=Utrecht
...                     state=Utrecht
...                     country=Netherlands (the)
...                     country_code=NL
...                     phone=0612345678
...                     email=demoa@specialisterren.nl
...                     password=12345678!aBX
# payment settings
...                     method=Buy Now Pay Later
...                     installments=3 Monthly Installments
...                     payment=Bank Transfer
...                     bank=Rabobank
...                     account_name=ac-name
...                     account_number=1
&{CUSTOMER}
...                     first_name=Jane
...                     last_name=Doe
...                     date_of_birth=02/02/1980
...                     address=Test street 98
...                     postcode=
...                     city=Vienna
...                     state=
...                     country=Austria
...                     phone=
...                     email=CUSTOMER@practicesoftwaretesting.com
...                     password=welcome01
&{ADMIN}
...                     email=admin@practicesoftwaretesting.com
...                     password=welcome01

${PRODUCT_LIST}
...    [
...    {"name": "Combination Pliers", "price": "$14.15", "status": ""},
...    {"name": "Pliers", "price": "$12.01", "status": ""},
...    {"name": "Long Nose Pliers", "price": "$14.24", "status": "Out of stock"},
...    {"name": "Slip Joint Pliers", "price": "$9.17", "status": ""}
...    ]


*** Keywords ***
Suite Setup
  [Documentation]  Test Suite Setup
  New Browser    ${BROWSER}    headless=${HEADLESS}
  Set Suite Metadata    Network Speed    ${NETWORK_SPEED}
  Set Suite Metadata    Tracing          ${TRACING}
  Set Suite Metadata    CPU Slowdown     ${CPU_SLOWDOWN}
  Log    Network speed=${NETWORK_SPEED} Tracing=${TRACING}  console=True

Suite Teardown
  [Documentation]  Test Suite Teardown
  Browser.Close Context  save_trace=${TRACING}

Test Teardown
  [Documentation]  Test Teardown
  EventLogger.Report Event Logging
  Run Keyword If Test Failed    Take Screenshot  fullPage=True

Test Setup
    [Documentation]  Open Browser Home Page
    Browser.New Context  tracing=${TRACING}
    EventLogger.Init  waitAfter=Browser.Click, Browser.Click With Options,Browser.Go To  
    ...               alerts=xpath=//div[contains(@class, 'alert-danger')]  
    ...               logLevel=DEBUG

    New Page

    #Sleep  5 seconds

    IF  ${NETWORK_SPEED} == "Fast 3 G"
      Throttle Network Speed To Fast 3 G
    ELSE IF  ${NETWORK_SPEED} == "Slow 3 G"
      Throttle Network Speed To Slow 3 G
    ELSE IF  ${NETWORK_SPEED} == "Disable Network Throttle"
      Disable Network Throttle
    END

    Goto Home Page

Goto Home Page
    [Documentation]    Goto toolshop home and verify page title

    ${current}  Get Url

    IF  "${current}" != "${BASE_URL}"
       Go To  ${BASE_URL}
       # ${home}    Get Element By Role    link    name=Practice Software Testing - Toolshop
       # Click  selector=${home}
    END

    # Wait and Verify: Main page is displayed
    Wait For Elements State  xpath=//title[contains(text(), 'Practice Software Testing')]  attached

Goto Login Page
    [Documentation]    Goto login page and verify page title

    # Click at the signin option
    ${l_link}    Get Element By Role    link    name=Sign in
    Click    ${l_link}

    # Verify: The login page is displayed
    Wait For Elements State  xpath=//h3[contains(text(), 'Login')]  attached

Verify Lists Of Dictionaries Equal
    [Documentation]  Check two list of dictionaries for equality
    [Arguments]    ${list1}    ${list2}

    ${len1}    Get Length    ${list1}
    ${len2}    Get Length    ${list2}

    # Check if the lists have the same length
    IF    '${len1}' != '${len2}'    Fail    Lists have different lengths

    FOR    ${i}    IN RANGE    ${len1}
        ${dict1}    Get From List    ${list1}    ${i}
        ${dict2}    Get From List    ${list2}    ${i}
        Dictionaries Should Be Equal  ${dict1}    ${dict2}
    END
