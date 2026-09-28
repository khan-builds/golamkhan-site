import { getChatGPTUser, chatGPTSignInPath } from "../chatgpt-auth";
import Desk from "./desk";
export const dynamic="force-dynamic";
export default async function ToolPage(){
 const user=await getChatGPTUser();
 if(!user)return <main className="login-screen"><section className="login-card"><div className="fomo-mark">fomo</div><p className="kicker">GROWTH TEAM · INTERN DESK</p><h1>Team schedule</h1><p>Sign in with ChatGPT, then use your intern PIN to open the shared desk.</p><a className="primary-button" href={chatGPTSignInPath("/tool")} target="_top">Continue with ChatGPT</a><small>Your PIN adds a second check. It never appears in page code.</small></section></main>;
 return <Desk />;
}
