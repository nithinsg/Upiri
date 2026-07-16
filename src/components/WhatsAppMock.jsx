/* Realistic WhatsApp notification mock-up — used to demonstrate the automated
   adherence-reminder workflow to management. Frontend demo only.

   PRODUCTION: this trigger (3 consecutive missed controller days) would run
   server-side against synced diary data and send a pre-approved template
   message via the WhatsApp Business API (webhook + message-template call).
   This component only visualises what the patient would receive. */

export default function WhatsAppMock({ message, time }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #D5DBE5", boxShadow: "0 8px 24px rgba(29,27,75,0.18)" }}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ background: "#075E54" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0"
          style={{ background: "#F5821F" }}>Ū</div>
        <div className="min-w-0">
          <div className="font-bold text-sm text-white leading-tight">ŪPIRI Care</div>
          <div className="text-[10px]" style={{ color: "#B7D9D4" }}>WhatsApp Business · automated reminder</div>
        </div>
      </div>
      <div className="p-3.5" style={{ background: "#ECE5DD" }}>
        <div className="rounded-lg rounded-tl-none bg-white p-3 text-sm" style={{ color: "#111B21", boxShadow: "0 1px 1px rgba(0,0,0,0.08)", maxWidth: "95%" }}>
          {message}
          <div className="text-right text-[10px] mt-1.5" style={{ color: "#8696A0" }}>{time} ✓✓</div>
        </div>
      </div>
    </div>
  );
}
