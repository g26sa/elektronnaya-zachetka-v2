-- Включаем TCP/IP на дефолтном инстансе MSSQLSERVER
EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE',
  N'Software\Microsoft\MSSQLServer\MSSQLServer\SuperSocketNetLib\Tcp',
  N'Enabled', REG_DWORD, 1;

-- Слушать на стандартном 1433 для всех IP
EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE',
  N'Software\Microsoft\MSSQLServer\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
  N'TcpPort', REG_SZ, N'1433';

EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE',
  N'Software\Microsoft\MSSQLServer\MSSQLServer\SuperSocketNetLib\Tcp\IPAll',
  N'TcpDynamicPorts', REG_SZ, N'';

PRINT 'TCP/IP enabled. Restart MSSQLSERVER service to apply.';
