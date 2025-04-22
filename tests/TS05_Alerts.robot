*** Settings ***
Documentation       Test alerts
Resource            common.resource
Test Tags           alerts

*** Test Cases ***
TC01 Toast
    [Documentation]    Test Angular toast
    [Tags]  logLevel:DEBUG
    Go To  https://ngx-toastr.vercel.app/

    Type Text  selector=id=toastTitle    txt=MyTitle_1
    Type Text  selector=id=toastMessage  txt=MyMessage_1
    Type Text  selector=id=toastTimeout  txt=1500
    Check Checkbox  selector=id=typeinfo
    Click  text=Open Toast

    #Type Text  selector=id=toastTitle    txt=MyTitle_2
    #Type Text  selector=id=toastMessage  txt=MyMessage_2
    #Type Text  selector=id=toastTimeout  txt=1500
    #Check Checkbox  selector=id=typeinfo
    #Click  text=Open Toast    

    Take Screenshot
    ${alert}  Get Element By Role    alert
    #Wait For Elements State  ${alert}  detached
    Sleep  3 seconds 
    Take Screenshot
 





# To Do: Add unblock account
