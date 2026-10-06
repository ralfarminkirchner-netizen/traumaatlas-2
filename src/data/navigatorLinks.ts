// Kuratierte Zuordnungen für den Symptom-Navigator (Anzeigenamen → Symptom-IDs)
export const methodSymptomsLocal: {
  exercises: Record<string, string[]>;
  methods: Record<string, string[]>;
} = {
  exercises: {
    "sos-54321": ["flashbacks", "panik", "trigger", "herzrasen", "hypervigilanz"],
    "sos-ausatmen": ["herzrasen", "panik", "reizbar", "hypervigilanz"],
    "sos-orientieren": ["neben-sich", "entrückt", "erstarrung", "konzentration"],
    voo: ["herzrasen", "magen", "reizbar", "hypervigilanz"],
    schuetteln: ["reizbar", "schmerzen", "herzrasen", "hypervigilanz"],
    "sicherer-ort": ["hypervigilanz", "flashbacks", "albttraeume", "leere"],
    koerperscan: ["erstarrt", "gefuehlsabstumpfung", "entrückt", "konzentration"],
    pendeln: ["gefuehlserinnerungen", "schmerzen", "scham", "erstarrt"],
    aktivieren: ["erstarrung", "neben-sich", "entrückt", "erstarrt"],
    abend: ["schlaf", "hypervigilanz", "aufdringlich"],
    selbstberuehrung: ["herzrasen", "panik", "haut", "reizbar"],
    "co-regulation": ["zurueckgezogen", "leere", "misstrauen", "naehe"],
  },
  methods: {
    EMDR: ["flashbacks", "albttraeume", "aufdringlich", "trigger"],
    "Traumafokussierte KVT / Exposition": ["vermeidung-orte", "gedankenverdrängung", "flashbacks", "hypervigilanz"],
    "Narrative Exposition (NET)": ["luecken", "gefuehlserinnerungen", "scham"],
    "Somatic Experiencing (SE)": ["gefuehlserinnerungen", "erstarrt", "herzrasen", "schmerzen", "schreck"],
    "Sensomotorische Psychotherapie": ["erstarrung", "erstarrt", "naehe", "misstrauen", "entrückt"],
    NARM: ["naehe", "misstrauen", "zurueckgezogen", "leere", "gefuehlsueberflutung"],
    "PITT (Reddemann)": ["hypervigilanz", "schlaf", "gefuehlsabstumpfung", "gefuehlserinnerungen"],
    "Imagery Rescripting": ["albttraeume", "aufdringlich", "scham"],
    Brainspotting: ["herzrasen", "panik", "gefuehlserinnerungen", "flashbacks"],
    "Deep Brain Reorienting": ["erstarrung", "neben-sich", "entrückt", "luecken"],
    "Ego-State / IFS (Teilearbeit)": ["scham", "selbstschaden", "gefuehlstaubheit", "misstrauen"],
    Schematherapie: ["scham", "leere", "naehe", "misstrauen", "gefuehlsueberflutung"],
    DBT: ["gefuehlsueberflutung", "selbstschaden", "reizbar", "panik", "konzentration"],
    "TRE (neurogenes Zittern)": ["herzrasen", "magen", "reizbar", "schmerzen"],
    "Traumasensitives Yoga": ["erstarrt", "schmerzen", "entrückt", "konzentration"],
    KReST: ["flashbacks", "trigger", "aufdringlich", "albttraeume"],
  },
};
