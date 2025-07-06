-- Create function to verify user password
CREATE OR REPLACE FUNCTION verify_user_password(password text)
RETURNS BOOLEAN SECURITY DEFINER AS
$$
BEGIN
  RETURN EXISTS (
    SELECT id 
    FROM auth.users 
    WHERE id = auth.uid() 
    AND encrypted_password = crypt(password::text, auth.users.encrypted_password)
  );
END;
$$ LANGUAGE plpgsql;

-- Restrict function access for security
REVOKE EXECUTE ON FUNCTION verify_user_password from anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_user_password TO authenticated; 