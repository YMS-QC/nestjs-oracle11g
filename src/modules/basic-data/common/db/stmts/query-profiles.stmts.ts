const QUERY_PROFILE = `
Select Env,
Job_Name,
Interface_Name,
srm_code,
orig_Url,
esb_Url,
esb_auth,
Headers,
Body,
Interface_Code,
Bus_Account,
Busaccount,
Simple_Flag,
Interval_Seconds,
Pause_Flag,
Pause_Seconds,
Stop_Flag,
Update_Row_Number,
Http_Row_Number
From CUX.Cux_Srm2_Interface_Profile p
Where p.env = :env
And p.job_name = :jobName
`;

export { QUERY_PROFILE };
