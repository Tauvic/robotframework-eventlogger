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
    Type Text  selector=id=toastTimeout  txt=0
    Check Checkbox  selector=id=progressBar
    Check Checkbox  selector=id=typeinfo
    Click  text=Open Toast

    Take Screenshot


TC02 Toast
    [Documentation]    Test Angular toast showing 3 alerts with timeout
    [Tags]  logLevel:DEBUG
    Go To  https://ngx-toastr.vercel.app/

    Type Text  selector=id=toastTitle    txt=MyTitle_1
    Type Text  selector=id=toastMessage  txt=MyMessage 1000
    Type Text  selector=id=toastTimeout  txt=1000
    Check Checkbox  selector=id=progressBar
    Check Checkbox  selector=id=typeinfo
    Click  text=Open Toast

    Type Text  selector=id=toastTitle    txt=MyTitle_2
    Type Text  selector=id=toastMessage  txt=MyMessage 2000
    Type Text  selector=id=toastTimeout  txt=2000
    Check Checkbox  selector=id=typeinfo
    Click  text=Open Toast    

    Type Text  selector=id=toastTitle    txt=MyTitle_3
    Type Text  selector=id=toastMessage  txt=MyMessage 3000
    Type Text  selector=id=toastTimeout  txt=3000
    Check Checkbox  selector=id=typeinfo
    Click  text=Open Toast    

    Sleep  4 seconds 
    Take Screenshot  
    
 





# To Do: Add unblock account
