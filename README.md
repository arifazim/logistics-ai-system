
## How to get service account credentials:
- Go to Google Cloud Console (https://console.cloud.google.com/)
- Select your project (gen-lang-client-0508629039)
- Navigate to APIs & Services > Credentials
- Click "Create Credentials" > "Service Account"
- Fill in the service account details:
    - Name: Something like "sheets-api-service"
    - Description: "Service account for Google Sheets API access"

- Click "Create and Continue"
- Grant roles (typically "Editor" or specific Sheets permissions)
- Click "Done"
- Click on the newly created service account
    - Go to "Keys" tab
    - Click "Add Key" > "Create new key"
    - Choose "JSON" format
    - Download the JSON file - this will be your service account credentials

The downloaded JSON will have the correct format with all the required fields including client_email, private_key, type: "service_account", etc.


## install PDF
npm install jspdf jspdf-autotable
