export const STMT_MARK_RCV_UPDATES = `
Begin
  apps.Cux_Srm2_Basic_Rcv_Pkg.Mark_Updates
                                     (Ln_Lookback_Days => :lookbackDays,
                                      Pd_Date_From     => :dateFrom,
                                      Pd_Date_To       => :dateTo,
                                      Pn_Max_Update_Rn => :maxRowNumber,
                                      Xn_Batch_Number  => :batchNumber,
                                      Xn_Update_Rownum => :rowsUpdated);
End;
`;
