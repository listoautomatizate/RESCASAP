import { getChatGPTUser } from './chatgpt-auth';
import RescataApp from './rescata-app';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const authUser = await getChatGPTUser();
  return <RescataApp authUser={authUser} />;
}
