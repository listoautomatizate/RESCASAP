import type { AppUser } from '../auth';
import RescataApp from '../rescata-app';

const demoUser: AppUser = {
  userId: 'webmcp-demo-judge',
  displayName: 'Jurado WebMCP',
  email: 'demo@rescasap.uy',
  fullName: 'Jurado WebMCP',
};

export default function WebMcpDemo() {
  return <RescataApp authUser={demoUser} demoMode />;
}
