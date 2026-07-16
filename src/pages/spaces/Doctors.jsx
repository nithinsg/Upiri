import { Clock, FileText, Microscope, Phone, Send, Users } from "lucide-react";
import { C, waLink } from "../../config.js";
import { Btn, Card, Chip } from "../../components/ui.jsx";

export default function Doctors({ go }) {
  return (
    <div>
      {/* HERO */}
      <div className="rounded-3xl overflow-hidden mb-6" style={{ background: C.indigo }}>
        <div className="p-6 sm:p-10">
          <Chip tone="orange">For referring physicians</Chip>
          <h1 className="disp font-extrabold text-white leading-tight mt-3" style={{ fontSize: "clamp(1.6rem, 4.5vw, 2.4rem)" }}>
            Your patient, back to you — with an answer — in 72 hours.
          </h1>
          <p className="telugu mt-2" style={{ color: C.marigold }}>వైద్యుల కోసం — మీ పేషెంట్, మీ దగ్గరకే.</p>
          <p className="mt-3 text-sm max-w-2xl" style={{ color: "#C9D2E6" }}>
            Refer any nodule — from any X-ray, CT or lab report — and we guarantee a Nodule Clinic appointment within
            48–72 hours. Work-up, Nodule Board review, tissue diagnosis where needed, and an outcome summary back to
            your desk within 72 hours of diagnosis. The patient remains yours.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Btn href={waLink("Physician referral: I'm Dr. ___ referring a patient with a lung nodule/finding. Please arrange a 48–72h fast-track Nodule Clinic slot.")}>
              <Send size={16} /> Refer a patient now
            </Btn>
            <Btn kind="ghost" href={waLink("I'm a physician. Please add me to the ŪPIRI referring-physician WhatsApp line.")}
              ><span style={{ color: "#fff" }} className="flex items-center gap-2"><Phone size={16} /> Join the referral line</span></Btn>
          </div>
        </div>
        <div className="px-6 sm:px-10 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ background: "#232159", color: "#AEB8D2" }}>
          <span>✓ 48–72h guaranteed fast-track</span>
          <span>✓ Outcome summary within 72h of diagnosis</span>
          <span>✓ MDT Nodule Board on every case</span>
          <span>✓ Patient returns to the referring physician</span>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl" style={{ background: C.indigoSoft, color: C.indigo }}><Clock size={22} /></div>
            <Chip tone="orange">48–72h</Chip>
          </div>
          <div className="disp font-bold" style={{ color: C.indigo }}>Nodule fast-track referral</div>
          <p className="text-sm mt-1 flex-1" style={{ color: "#4A4880" }}>
            Any nodule, any report, any lab. One WhatsApp message books the slot; we handle records, imaging review and
            the AI second read. You get a call if anything changes, and the full summary when it's done.
          </p>
          <div className="mt-3">
            <Btn small href={waLink("Physician referral: I'm Dr. ___ referring a patient with a lung nodule/finding. Please arrange a 48–72h fast-track Nodule Clinic slot.")}>
              <Send size={14} /> Send a referral
            </Btn>
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl" style={{ background: C.indigoSoft, color: C.indigo }}><Users size={22} /></div>
            <Chip tone="indigo">Quarterly MDT</Chip>
          </div>
          <div className="disp font-bold" style={{ color: C.indigo }}>The Nodule Board</div>
          <p className="text-sm mt-1 flex-1" style={{ color: "#4A4880" }}>
            Pulmonology, radiology, oncology and thoracic surgery in one sitting — one plan, not four opinions.
            Referring physicians are invited to present and discuss their own cases each quarter.
          </p>
          <div className="mt-3">
            <Btn small kind="dark" href={waLink("I'm a physician. Please add me to the quarterly Nodule Board invite list.")}>
              <Users size={14} /> Join the invite list
            </Btn>
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl" style={{ background: C.indigoSoft, color: C.indigo }}><FileText size={22} /></div>
            <Chip tone="orange">Monthly</Chip>
          </div>
          <div className="disp font-bold" style={{ color: C.indigo }}>Case of the Month</div>
          <p className="text-sm mt-1 flex-1" style={{ color: "#4A4880" }}>
            Anonymised pathways from the Nodule Board — how the AI flag, the board decision and the biopsy choice came
            together, with teaching pearls for daily practice.
          </p>
          <div className="mt-3">
            <Btn small kind="ghost" onClick={() => go("case")}>Read this month's case</Btn>
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl" style={{ background: C.indigoSoft, color: C.indigo }}><Microscope size={22} /></div>
            <Chip tone="green">One roof</Chip>
          </div>
          <div className="disp font-bold" style={{ color: C.indigo }}>The capability behind the promise</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {["EBUS", "Radial EBUS", "Archimedes BTPNA", "Cone-beam CT biopsy", "Cryobiopsy", "MDT Nodule Board", "Phase III trial access"].map((x) => (
              <Chip key={x} tone="orange">{x}</Chip>
            ))}
          </div>
          <p className="text-sm mt-2 flex-1" style={{ color: "#4A4880" }}>
            The region's widest biopsy arsenal plus surgery and oncology under the same roof — so your patient's journey
            never leaves the building, and never leaves your sight.
          </p>
        </Card>
      </div>
    </div>
  );
}
