export const createPostgresDbConnectionUri = ({host, port, user, password, name}: {host: string, port: number, user: string, password: string, name: string}): string => {
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const encodedHost = encodeURIComponent(host);
  const encodedName = encodeURIComponent(name);

  return `postgresql://${encodedUser}:${encodedPassword}@${encodedHost}:${port}/${encodedName}`;
}