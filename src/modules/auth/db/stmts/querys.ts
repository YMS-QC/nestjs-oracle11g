import { QUERY } from '@/common/ora/interface/OraTypes';

export function validateUser(username: string): QUERY {
    return {
        statement: `
     Select Usr.user_name as username,
            Usr.user_id as User_Id,
        Get_Pwd.Decrypt((Select (Select Get_Pwd.Decrypt(Fnd_Web_Sec.Get_Guest_Username_Pwd,
                                                       Usertable.Encrypted_Foundation_Password)
                                  From Dual) As Apps_Password
                          From Fnd_User Usertable
                         Where Usertable.User_Name =
                               (Select Substr(Fnd_Web_Sec.Get_Guest_Username_Pwd,
                                              1,
                                              Instr(Fnd_Web_Sec.Get_Guest_Username_Pwd,
                                                    '/') - 1)
                                  From Dual)),
                        Usr.Encrypted_User_Password) Password
   From Fnd_User Usr
  Where Usr.User_Name = :username`,
        binds: { username },
        name: `validatePassword ${username}`,
    };
}

export type ValidateUserResult = {
    userId: string;
    username: string;
    password: string;
};
