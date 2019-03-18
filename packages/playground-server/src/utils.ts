import Axios from "axios";

export default function informSlack(text: string) {
  if (process.env.SLACK_SUPPORT_WEBHOOK_URL) {
    try {
      Axios.post(process.env.SLACK_SUPPORT_WEBHOOK_URL, { text });
    } catch {}
  }
}
