import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";
import {
  MessageSquare, Mail, Calendar, Phone, Users, Bot, Zap,
  ArrowRight, Check, AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AutomationGuidePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">How ReplyAI Automation Works</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          A plain-language guide for connecting your accounts and letting ReplyAI
          handle inbound conversations automatically.
        </p>
      </header>

      {/* The big picture */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-medium mb-3">The big picture</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          ReplyAI is a hub for customer conversations. You connect your
          Facebook Page, Instagram account, WhatsApp Business number, Google
          (Gmail + Calendar), and LinkedIn — then create automation rules
          that say &quot;when a customer does X, do Y&quot;. When someone messages
          you on any of those platforms, the message arrives in ReplyAI via a
          webhook, gets matched against your rules, and either gets an
          AI-generated reply, a canned response, an escalation to your team,
          or a scheduled follow-up.
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="border rounded-md p-3">
            <div className="font-medium mb-1">1. Connect</div>
            <p className="text-muted-foreground">
              Go to <Link href="/connections" className="underline underline-offset-2">Connections</Link> and authorize each platform with OAuth.
            </p>
          </div>
          <div className="border rounded-md p-3">
            <div className="font-medium mb-1">2. Register webhooks</div>
            <p className="text-muted-foreground">
              Each platform needs a webhook URL pointed at ReplyAI so we receive inbound events.
            </p>
          </div>
          <div className="border rounded-md p-3">
            <div className="font-medium mb-1">3. Create rules</div>
            <p className="text-muted-foreground">
              In <Link href="/automation" className="underline underline-offset-2">Automation</Link>, define triggers and actions per platform.
            </p>
          </div>
        </div>
      </section>

      {/* Platform-by-platform guide */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium">Per-platform setup</h2>

        {/* WhatsApp */}
        <PlatformGuide
          icon={Phone}
          name="WhatsApp Business"
          steps={[
            <>
              Sign up at <code className="bg-muted px-1 py-0.5 rounded text-[11px]">business.whatsapp.com</code> and complete Meta Business Verification. This typically takes 1–3 days.
            </>,
            <>In your Meta Business Manager, go to WhatsApp Manager → Phone Numbers. Note the <strong>Phone Number ID</strong> of your number.</>,
            <>Create a <strong>System User</strong> in Meta Business Settings with <code className="bg-muted px-1 py-0.5 rounded text-[11px]">whatsapp_business_messaging</code> permission and generate a permanent access token.</>,
            <><Link href="/connections" className="underline underline-offset-2 inline-flex items-center gap-1">
              Go to Connections <ArrowRight className="h-3 w-3" />
            </Link>, paste your Phone Number ID and token. ReplyAI validates and stores them (encrypted).</>,
            <>In WhatsApp Manager, configure the webhook callback URL to <code className="bg-muted px-1 py-0.5 rounded text-[11px] break-all">https://reply-beryl.vercel.app/api/webhooks/meta</code> with verify token set to the <code className="bg-muted px-1 py-0.5 rounded text-[11px]">META_WEBHOOK_VERIFY_TOKEN</code> env var.</>,
            <>Create an automation rule: <em>When customer sends a WhatsApp message → Generate AI reply</em>. Test by texting your business number.</>,
          ]}
          howItWorks="When a customer sends a WhatsApp message to your business number, Meta calls our webhook with the sender's phone number and message text. ReplyAI looks up your automation rules for WHATSAPP/MESSAGE_RECEIVED, generates a reply via the AI chatbot, and sends it back through WhatsApp Cloud API. The whole round-trip takes 1–3 seconds."
        />

        {/* Instagram */}
        <PlatformGuide
          icon={Users}
          name="Instagram"
          steps={[
            <>Convert your Instagram account to a <strong>Business or Creator</strong> account, and link it to a Facebook Page (required by Meta).</>,
            <>Register a Meta app at <code className="bg-muted px-1 py-0.5 rounded text-[11px]">developers.facebook.com</code> with Instagram Graph API added.</>,
            <>Set <code className="bg-muted px-1 py-0.5 rounded text-[11px]">FACEBOOK_APP_ID</code> and <code className="bg-muted px-1 py-0.5 rounded text-[11px]">FACEBOOK_APP_SECRET</code> in Vercel env vars, and add the OAuth redirect URI <code className="bg-muted px-1 py-0.5 rounded text-[11px] break-all">https://reply-beryl.vercel.app/api/connections/INSTAGRAM/callback</code> in your app dashboard.</>,
            <><Link href="/connections" className="underline underline-offset-2 inline-flex items-center gap-1">
              Go to Connections <ArrowRight className="h-3 w-3" />
            </Link> and click Connect on Instagram. Approve the scopes (instagram_basic, instagram_manage_messages).</>,
            <>In the App Dashboard, subscribe the webhook to <strong>messages</strong> field under Instagram, pointing to <code className="bg-muted px-1 py-0.5 rounded text-[11px] break-all">https://reply-beryl.vercel.app/api/webhooks/meta</code>.</>,
            <>Create an automation rule: <em>When customer sends a DM → Generate AI reply</em>. Test by DMing your own account from a personal account.</>,
          ]}
          howItWorks="When someone DMs your Instagram Business account, Meta posts the message to our webhook with the IG user's IGScoped ID and message text. ReplyAI looks up the matching Instagram Business Account ID across PlatformConnection rows, finds the rules, and sends the AI-generated reply via the Instagram Messaging API. Note: Instagram requires the conversation to be initiated by the customer first — you cannot cold-message users who haven't messaged you in the last 7 days."
        />

        {/* Facebook */}
        <PlatformGuide
          icon={MessageSquare}
          name="Facebook Messenger"
          steps={[
            <>You need a Facebook Page (not a personal profile). Create one at <code className="bg-muted px-1 py-0.5 rounded text-[11px]">facebook.com/pages</code> if you don&apos;t have one.</>,
            <>Create a Meta app at <code className="bg-muted px-1 py-0.5 rounded text-[11px]">developers.facebook.com</code> and add the Messenger product. Request Advanced Access for <code className="bg-muted px-1 py-0.5 rounded text-[11px]">pages_messaging</code> if you want to message users who haven&apos;t messaged you in the last 24 hours.</>,
            <>Set <code className="bg-muted px-1 py-0.5 rounded text-[11px]">FACEBOOK_APP_ID</code>, <code className="bg-muted px-1 py-0.5 rounded text-[11px]">FACEBOOK_APP_SECRET</code>, <code className="bg-muted px-1 py-0.5 rounded text-[11px]">META_APP_SECRET</code>, and <code className="bg-muted px-1 py-0.5 rounded text-[11px]">META_WEBHOOK_VERIFY_TOKEN</code> in Vercel env vars.</>,
            <><Link href="/connections" className="underline underline-offset-2 inline-flex items-center gap-1">
              Go to Connections <ArrowRight className="h-3 w-3" />
            </Link> and click Connect on Facebook. Approve the OAuth scopes. ReplyAI stores your Page access token (encrypted).</>,
            <>In the App Dashboard → Webhooks, subscribe to the <strong>messages</strong> field for the Page, using callback URL <code className="bg-muted px-1 py-0.5 rounded text-[11px] break-all">https://reply-beryl.vercel.app/api/webhooks/meta</code> and your verify token.</>,
            <>Create an automation rule: <em>When customer sends a Messenger message → Generate AI reply</em>. Test by messaging your Page from a personal account.</>,
          ]}
          howItWorks="When a customer sends a Messenger message to your Facebook Page, Meta posts to our webhook with the sender's PSID (Page-Scoped ID) and the message text. ReplyAI looks up the Page ID across your PlatformConnection rows to determine which org owns the inbound, runs the rules engine, and sends the AI-generated reply back to the customer via the Messenger Send API. Facebook enforces a 24-hour messaging window — after that, you can only send with specific message tags (e.g. ACCOUNT_UPDATE). ReplyAI uses this tag automatically."
        />

        {/* Google (Gmail + Calendar) */}
        <PlatformGuide
          icon={Mail}
          name="Google (Gmail + Calendar + Drive)"
          steps={[
            <>Go to <code className="bg-muted px-1 py-0.5 rounded text-[11px]">console.cloud.google.com</code>, create a project, and enable the Gmail API, Calendar API, and Drive API.</>,
            <>Create an OAuth 2.0 Client ID credential (Web application). Add <code className="bg-muted px-1 py-0.5 rounded text-[11px] break-all">https://reply-beryl.vercel.app/api/connections/GOOGLE/callback</code> as an authorized redirect URI.</>,
            <>Set <code className="bg-muted px-1 py-0.5 rounded text-[11px]">GOOGLE_CLIENT_ID</code> and <code className="bg-muted px-1 py-0.5 rounded text-[11px]">GOOGLE_CLIENT_SECRET</code> in Vercel env vars. Set <code className="bg-muted px-1 py-0.5 rounded text-[11px]">APP_PUBLIC_URL</code> so the AI reply generator can call back to your deployment.</>,
            <><Link href="/connections" className="underline underline-offset-2 inline-flex items-center gap-1">
              Go to Connections <ArrowRight className="h-3 w-3" />
            </Link> and click Connect on Google. Approve scopes (gmail.send, gmail.readonly, calendar, drive.file).</>,
            <>In GCP, create a Pub/Sub topic (e.g. <code className="bg-muted px-1 py-0.5 rounded text-[11px]">gmail-inbox</code>) and a push subscription to <code className="bg-muted px-1 py-0.5 rounded text-[11px] break-all">https://reply-beryl.vercel.app/api/webhooks/google</code> with OIDC verification.</>,
            <>Call the Gmail API <code className="bg-muted px-1 py-0.5 rounded text-[11px]">users/me/watch</code> endpoint with your topic name so Google starts pushing new-email notifications.</>,
            <>Create an automation rule: <em>When a new email arrives → Generate AI reply</em>. Test by sending yourself an email from a personal address.</>,
          ]}
          howItWorks="When a new email arrives in your Gmail inbox, Google Pub/Sub pushes a notification to our webhook. ReplyAI fetches the email subject + body via Gmail API, runs the rules engine, generates an AI reply, and sends it via the Gmail Send API. For Calendar, you register the calendar for push notifications — when an event is about to start, ReplyAI fires a CALENDAR_STARTING trigger and your rule can send a reminder to attendees."
        />

        {/* LinkedIn */}
        <PlatformGuide
          icon={Users}
          name="LinkedIn"
          steps={[
            <>Apply for LinkedIn Marketing API access at <code className="bg-muted px-1 py-0.5 rounded text-[11px]">linkedin.com/developers</code>. The review takes 1–2 weeks.</>,
            <>Create an app, add the <code className="bg-muted px-1 py-0.5 rounded text-[11px]">w_member_social</code> and <code className="bg-muted px-1 py-0.5 rounded text-[11px]">r_organization_social</code> scopes.</>,
            <>Set <code className="bg-muted px-1 py-0.5 rounded text-[11px]">LINKEDIN_CLIENT_ID</code> and <code className="bg-muted px-1 py-0.5 rounded text-[11px]">LINKEDIN_CLIENT_SECRET</code> in Vercel env vars.</>,
            <><Link href="/connections" className="underline underline-offset-2 inline-flex items-center gap-1">
              Go to Connections <ArrowRight className="h-3 w-3" />
            </Link> and click Connect on LinkedIn. Approve OAuth.</>,
            <>Create a rule: <em>When a connection sends a message → Generate AI reply</em>.</>,
          ]}
          howItWorks="LinkedIn is the strictest platform — message automation is rate-limited (100 invites/week per sender), requires app review for production, and the messaging API has invite-only access. ReplyAI throttles and retries on 429s automatically. Direct messaging without prior engagement is generally not supported by LinkedIn's TOS — ReplyAI is best used here for automating responses to inbound messages only."
        />
      </section>

      {/* What cannot be done */}
      <section className="rounded-lg border bg-muted/20 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <h2 className="text-sm font-medium mb-2">What is NOT possible</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Play Store apps do not expose APIs that allow third-party
              automation. You cannot, for example, automate replies to messages
              inside Telegram, Snapchat, TikTok DMs, Signal, WeChat, or any
              app that does not provide an official Business API. The
              platforms above (Meta family + Google + LinkedIn) cover the vast
              majority of business messaging. For everything else, use
              ReplyAI&apos;s website widget — embed it on any page where customers
              can chat with you directly.
            </p>
          </div>
        </div>
      </section>

      {/* Rule patterns */}
      <section>
        <h2 className="text-sm font-medium mb-3">Common automation patterns</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PatternCard
            icon={Bot}
            title="Auto-reply to all inbound DMs"
            trigger="Any platform, MESSAGE_RECEIVED, no condition"
            action="AI_REPLY with persona = professional"
          />
          <PatternCard
            icon={Zap}
            title="Pricing question canned reply"
            trigger="WhatsApp, MESSAGE_RECEIVED, text contains 'pricing'"
            action="CANNED_REPLY with your pricing FAQ"
          />
          <PatternCard
            icon={Calendar}
            title="Calendar reminder to attendees"
            trigger="GOOGLE, CALENDAR_STARTING"
            action="AI_REPLY with persona = professional + systemPrompt about the event"
          />
          <PatternCard
            icon={AlertCircle}
            title="Escalate angry messages to human"
            trigger="Any platform, text contains 'refund' OR 'angry' OR 'lawsuit'"
            action="ESCALATE → marks conversation HUMAN"
          />
          <PatternCard
            icon={Phone}
            title="Follow-up after WhatsApp opt-in"
            trigger="WhatsApp, text contains 'opt in'"
            action="SCHEDULE_FOLLOWUP after 30 minutes"
          />
          <PatternCard
            icon={Mail}
            title="Auto-acknowledge inbound emails"
            trigger="GOOGLE, EMAIL_RECEIVED, from not contains @replyai.app"
            action="AI_REPLY with persona = professional"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium">Ready to wire it up?</h2>
          <p className="text-xs text-muted-foreground mt-1">Connect at least one platform, then create your first rule.</p>
        </div>
        <Link href="/connections">
          <button className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-xs font-medium text-background hover:bg-foreground/90 transition-colors">
            Go to Connections
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </button>
        </Link>
        <Link href="/automation">
          <button className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-xs font-medium hover:bg-accent transition-colors">
            Open Automation
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </button>
        </Link>
      </section>
    </div>
  );
}

function PlatformGuide({
  icon: Icon,
  name,
  steps,
  howItWorks,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  steps: React.ReactNode[];
  howItWorks: string;
}) {
  return (
    <details className="rounded-lg border bg-card">
      <summary className="px-5 py-4 cursor-pointer flex items-center gap-3 select-none">
        <div className="h-9 w-9 rounded-md border bg-muted/40 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">{name}</div>
          <div className="text-[11px] text-muted-foreground">{steps.length} steps · click to expand</div>
        </div>
      </summary>
      <div className="px-5 pb-5 space-y-4">
        <ol className="space-y-2.5 text-sm">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 h-5 w-5 rounded-full border bg-muted/40 flex items-center justify-center text-[10px] font-medium tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <div className="text-sm text-foreground leading-relaxed pt-0.5">{step}</div>
            </li>
          ))}
        </ol>
        <div className="border-t pt-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">How it works after setup</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{howItWorks}</p>
        </div>
      </div>
    </details>
  );
}

function PatternCard({
  icon: Icon,
  title,
  trigger,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  trigger: string;
  action: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-md border bg-muted/40 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">{title}</div>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div><span className="text-foreground/80 font-medium">When:</span> {trigger}</div>
        <div><span className="text-foreground/80 font-medium">Then:</span> {action}</div>
      </div>
    </div>
  );
}
