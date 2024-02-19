const SEQUENCE = `Select apps.Cux_Basic_Data_Batch_s.Nextval as sequence From Dual`;

const INSERT_REQUEST = `
Insert Into cux.cux_basic_data_requests
(
   message_id 
  ,syscode    
  ,data_topic 
  ,request_url 
  ,request_header 
  ,request_time 
)

Values ( 
  :messageId,
  :syscode,
  :dataTopic,
  :requestUrl,
  :requestHeader,
  sysdate
)
`;

const INSERT_REQUEST_BODY = `
Insert Into Cux.Cux_Basic_Data_Req_Body
  (Message_Id, Creation_Date, Belongs_To, Body)
Values
  (:messageId, sysdate, 'REQUEST', :requestBody)
`;

const INSERT_RESPONSE_BODY = `
Insert Into Cux.Cux_Basic_Data_Req_Body
  (Message_Id, Creation_Date, Belongs_To, Body)
Values
  (:messageId, sysdate, 'RESPONSE', :responseBody)
`;

export { SEQUENCE, INSERT_REQUEST, INSERT_REQUEST_BODY, INSERT_RESPONSE_BODY };
