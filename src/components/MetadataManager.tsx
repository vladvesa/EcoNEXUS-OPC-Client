import { useState, useEffect } from 'react';
import { EquipmentRecord, EquipmentGeneralData, EquipmentType, Subscription } from '../types';
import { WebSocketClient } from '../utils/websocketClient';
import './MetadataManager.css';


interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'textarea' | 'select';
  unit?: string;
  placeholder?: string;
  options?: string[];
  span?: boolean;
}

const EQUIPMENT_TYPES: EquipmentType[] = [
  'Pompă', 'Suflantă', 'Convertizor de Frecvență (CSF)', 'Aerator',
  'Electrovalvă', 'Traductor de Nivel', 'Senzor de Presiune', 'Debitmetru',
  'Analizor de Rețea Electrică', 'Dozator Clor', 'Detector Clor în Aer',
  'PLC / RTU', 'HMI (Panou Operator)', 'UPS / Acumulator', 'Panou Solar',
];

// ── CÂMPURI GENERALE (comune tuturor echipamentelor) ──────────────────────
const GENERAL_FIELDS: FieldConfig[] = [
  { key: 'cod',                 label: 'Cod',                    type: 'text',  placeholder: 'Identificator unic' },
  { key: 'etichetaEchipament',  label: 'Etichetă Echipament',    type: 'text',  placeholder: 'Barcode / etichetă fizică' },
  { key: 'denumire',            label: 'Denumire',               type: 'text',  placeholder: 'Denumire completă', span: true },
  { key: 'pozitieSchema',       label: 'Poziție Schemă',         type: 'text',  placeholder: 'ex. P1SF, V3, FIT-01' },
  { key: 'locatie',             label: 'Locație',                type: 'text',  placeholder: 'Locație fizică în stație' },
  { key: 'sistem',              label: 'Sistem',                 type: 'text',  placeholder: 'ex. Sistem pompare' },
  { key: 'grup',                label: 'Grup',                   type: 'text' },
  { key: 'portofoliu',          label: 'Portofoliu',             type: 'text',  placeholder: 'ex. Investiții, PIU' },
  { key: 'responsabil',         label: 'Responsabil',            type: 'text' },
  { key: 'dataPunereFunctiune1', label: 'Data Punere în Funcțiune', type: 'date' },
  { key: 'dataPunereFunctiune2', label: 'Data Repunere în Funcțiune', type: 'date' },
  { key: 'gestiune',            label: 'Gestiune',               type: 'text' },
  { key: 'grupa',               label: 'Grupă Contabilă',        type: 'text',  placeholder: 'ex. 2131' },
  { key: 'subgrupa',            label: 'Subgrupă',               type: 'text' },
  { key: 'codObInv',            label: 'Cod Ob. Inv.',           type: 'text' },
  { key: 'serie',               label: 'Serie',                  type: 'text' },
  { key: 'observatii',          label: 'Observații',             type: 'textarea', span: true },
];

const FABRICATIE_FIELDS: FieldConfig[] = [
  { key: 'fabricant',       label: 'Fabricant',         type: 'text', placeholder: 'ex. Grundfos, Siemens, Endress+Hauser' },
  { key: 'anFabricatie',    label: 'An Fabricație',     type: 'text', placeholder: 'ex. 2022' },
  { key: 'modelFabricatie', label: 'Model',             type: 'text', placeholder: 'ex. CM5-4' },
  { key: 'serieFabricatie', label: 'Serie Fabricație',  type: 'text' },
];

const COSTURI_FIELDS: FieldConfig[] = [
  { key: 'zona',     label: 'Zonă',                      type: 'text' },
  { key: 'purtator', label: 'Purtător (Centru de Cost)', type: 'text' },
];

const DOCUMENTE_FIELDS: FieldConfig[] = [
  { key: 'furnizor',       label: 'Furnizor',                   type: 'text' },
  { key: 'distribuitor',   label: 'Distribuitor',               type: 'text' },
  { key: 'telefonService', label: 'Telefon Service',            type: 'text' },
  { key: 'nrContract',     label: 'Nr. Contract',               type: 'text' },
  { key: 'garantieExpira', label: 'Garanție Expiră',            type: 'date' },
  { key: 'manualTehnicUrl', label: 'Manual Tehnic (URL / Cale)', type: 'text', span: true },
  { key: 'codDocFurn',     label: 'Cod Doc. Furnizor',          type: 'text' },
  { key: 'nrDocFurn',      label: 'Nr. Doc. Furnizor',          type: 'text' },
  { key: 'dataDocFurn',    label: 'Data Doc. Furnizor',         type: 'date' },
  { key: 'codDocPF',       label: 'Cod Doc. Punere în Funcțiune', type: 'text' },
  { key: 'nrDocPF',        label: 'Nr. Doc. Punere în Funcțiune', type: 'text' },
  { key: 'dataDocPF',      label: 'Data Doc. Punere în Funcțiune', type: 'date' },
  { key: 'codDocMiscare',  label: 'Cod Doc. Mișcare',           type: 'text' },
  { key: 'nrDocMiscare',   label: 'Nr. Doc. Mișcare',           type: 'text' },
  { key: 'dataDocMiscare', label: 'Data Doc. Mișcare',          type: 'date' },
];

// ── CÂMPURI SPECIFICE PE TIP ECHIPAMENT ──────────────────────────────────
const EQUIPMENT_SCHEMAS: Partial<Record<EquipmentType, FieldConfig[]>> = {
  'Pompă': [
    { key: 'tipPompa',         label: 'Tip Pompă',               type: 'text',   placeholder: 'ex. Centrifugă multietajată' },
    { key: 'qNominal',         label: 'Q Nominal',               type: 'number', unit: 'm³/h' },
    { key: 'hNominal',         label: 'H Nominal',               type: 'number', unit: 'mCA' },
    { key: 'putereMotor',      label: 'Putere Motor',            type: 'number', unit: 'kW' },
    { key: 'randamentNominal', label: 'Randament Nominal',       type: 'number', unit: '%' },
    { key: 'turatieNominala',  label: 'Turație Nominală',        type: 'number', unit: 'rpm' },
    { key: 'tensiuneAlimentare', label: 'Tensiune Alimentare',   type: 'number', unit: 'V' },
    { key: 'curentNominal',    label: 'Curent Nominal',          type: 'number', unit: 'A' },
    { key: 'frecventaNominala', label: 'Frecvență Nominală',     type: 'number', unit: 'Hz' },
    { key: 'gradProtectieMotor', label: 'Grad Protecție Motor',  type: 'text',   placeholder: 'ex. IP55' },
    { key: 'clasaIzolatie',    label: 'Clasă Izolație',          type: 'text',   placeholder: 'ex. F' },
    { key: 'regimFunctionare', label: 'Regim Funcționare',       type: 'select', options: ['S1', 'S2', 'S3', 'S4', 'S5'] },
    { key: 'dnAspiratie',      label: 'DN Aspirație',            type: 'number', unit: 'mm' },
    { key: 'dnRefulare',       label: 'DN Refulare',             type: 'number', unit: 'mm' },
    { key: 'materialCarcasa',  label: 'Material Carcasă',        type: 'text',   placeholder: 'ex. Fontă / Inox' },
    { key: 'termistorMontat',  label: 'Termistor Montat',        type: 'boolean' },
    { key: 'cuConvertizorFrec', label: 'Cu Convertizor Frecvență', type: 'boolean' },
    { key: 'oreMaximeRevizie', label: 'Ore Maxime Revizie',      type: 'number', unit: 'ore' },
  ],
  'Suflantă': [
    { key: 'tipSuflanta',      label: 'Tip Suflantă',            type: 'text',   placeholder: 'ex. Roots' },
    { key: 'debitAerNominal',  label: 'Debit Aer Nominal',       type: 'number', unit: 'm³/h' },
    { key: 'presiuneNominala', label: 'Presiune Nominală',       type: 'number', unit: 'mbar' },
    { key: 'putereMotor',      label: 'Putere Motor',            type: 'number', unit: 'kW' },
    { key: 'turatieNominala',  label: 'Turație Nominală',        type: 'number', unit: 'rpm' },
    { key: 'tensiuneAlimentare', label: 'Tensiune Alimentare',   type: 'number', unit: 'V' },
    { key: 'curentNominal',    label: 'Curent Nominal',          type: 'number', unit: 'A' },
    { key: 'gradProtectie',    label: 'Grad Protecție',          type: 'text',   placeholder: 'ex. IP55' },
    { key: 'nivelZgomot',      label: 'Nivel Zgomot',            type: 'number', unit: 'dB(A)' },
    { key: 'filtruAerMontat',  label: 'Filtru Aer Montat',       type: 'boolean' },
  ],
  'Convertizor de Frecvență (CSF)': [
    { key: 'tipCSF',              label: 'Tip CSF',               type: 'text',   placeholder: 'ex. Siemens G120' },
    { key: 'putereNominala',      label: 'Putere Nominală',       type: 'number', unit: 'kW' },
    { key: 'curentNominalIesire', label: 'Curent Nominal Ieșire', type: 'number', unit: 'A' },
    { key: 'tensiuneIntrare',     label: 'Tensiune Intrare',      type: 'number', unit: 'V' },
    { key: 'frecventaIesireMax',  label: 'Frecvență Ieșire Max',  type: 'number', unit: 'Hz' },
    { key: 'frecventaIesireMin',  label: 'Frecvență Ieșire Min',  type: 'number', unit: 'Hz' },
    { key: 'gradProtectie',       label: 'Grad Protecție',        type: 'text',   placeholder: 'ex. IP20' },
    { key: 'protocolComunicatie', label: 'Protocol Comunicație',  type: 'text',   placeholder: 'ex. Profibus / Profinet' },
    { key: 'versiuneFirmware',    label: 'Versiune Firmware',     type: 'text' },
    { key: 'tipControl',          label: 'Tip Control',           type: 'text',   placeholder: 'ex. Vector sensorless' },
  ],
  'Aerator': [
    { key: 'tipAerator',          label: 'Tip Aerator',           type: 'text',   placeholder: 'ex. Aerator de suprafață' },
    { key: 'putereMotor',         label: 'Putere Motor',          type: 'number', unit: 'kW' },
    { key: 'turatieMotor',        label: 'Turație Motor',         type: 'number', unit: 'rpm' },
    { key: 'tensiuneAlimentare',  label: 'Tensiune Alimentare',   type: 'number', unit: 'V' },
    { key: 'eficientaTransferO2', label: 'Eficiență Transfer O₂', type: 'number', unit: 'kgO₂/kWh' },
    { key: 'gradProtectie',       label: 'Grad Protecție',        type: 'text',   placeholder: 'ex. IP68' },
  ],
  'Electrovalvă': [
    { key: 'tipValva',       label: 'Tip Valvă',              type: 'text',   placeholder: 'ex. Fluture / Sertar' },
    { key: 'dn',             label: 'DN',                     type: 'number', unit: 'mm' },
    { key: 'pn',             label: 'PN',                     type: 'number', unit: 'bar' },
    { key: 'tipActionare',   label: 'Tip Acționare',          type: 'text',   placeholder: 'ex. Electric 24VDC' },
    { key: 'tensiuneBobina', label: 'Tensiune Bobină',        type: 'number', unit: 'V' },
    { key: 'timpManevra',    label: 'Timp Manevră',           type: 'number', unit: 's' },
    { key: 'pozitieDefault', label: 'Poziție Default',        type: 'select', options: ['Închis', 'Deschis'] },
    { key: 'gradProtectie',  label: 'Grad Protecție',         type: 'text',   placeholder: 'ex. IP67' },
    { key: 'materialCorp',   label: 'Material Corp',          type: 'text',   placeholder: 'ex. Fontă / Inox' },
    { key: 'cuFeedback',     label: 'Cu Feedback Poziție',    type: 'boolean' },
  ],
  'Traductor de Nivel': [
    { key: 'tipPrincipiuMasura', label: 'Principiu Măsură',       type: 'text',   placeholder: 'ex. Hidrostatic, Radar, Ultrasonic' },
    { key: 'gamaMasura',         label: 'Gamă Măsură',            type: 'number', unit: 'm' },
    { key: 'semnalIesire',       label: 'Semnal Ieșire',          type: 'text',   placeholder: 'ex. 4-20 mA / 2 fire' },
    { key: 'tensiuneAlim',       label: 'Tensiune Alimentare',    type: 'number', unit: 'V' },
    { key: 'precizie',           label: 'Precizie',               type: 'number', unit: '% span' },
    { key: 'rezolutie',          label: 'Rezoluție',              type: 'number', unit: 'mm' },
    { key: 'gradProtectie',      label: 'Grad Protecție',         type: 'text',   placeholder: 'ex. IP68' },
    { key: 'gamaTempLucru',      label: 'Gamă Temperatură Lucru', type: 'text',   placeholder: 'ex. -40 … +80 °C' },
    { key: 'certificareATEX',    label: 'Certificare ATEX',       type: 'text' },
    { key: 'lungimeCablu',       label: 'Lungime Cablu',          type: 'number', unit: 'm' },
  ],
  'Senzor de Presiune': [
    { key: 'gamaMasura',        label: 'Gamă Măsură',            type: 'number', unit: 'bar' },
    { key: 'semnalIesire',      label: 'Semnal Ieșire',          type: 'text',   placeholder: 'ex. 4-20 mA / 2 fire' },
    { key: 'precizie',          label: 'Precizie (BFSL)',         type: 'number', unit: '% span' },
    { key: 'repetabilitate',    label: 'Repetabilitate',          type: 'number', unit: '% span' },
    { key: 'conexiuneProcess',  label: 'Conexiune Proces',        type: 'text',   placeholder: 'ex. G 1/4' },
    { key: 'materialCarcasa',   label: 'Material Carcasă',        type: 'text',   placeholder: 'ex. Inox 316L' },
    { key: 'tensiuneAlim',      label: 'Tensiune Alimentare',    type: 'number', unit: 'V' },
    { key: 'gamaTempLucru',     label: 'Gamă Temperatură Lucru', type: 'text',   placeholder: 'ex. -40 … +80 °C' },
    { key: 'gradProtectie',     label: 'Grad Protecție',         type: 'text',   placeholder: 'ex. IP68' },
    { key: 'lungimeCablu',      label: 'Lungime Cablu',          type: 'number', unit: 'm' },
  ],
  'Debitmetru': [
    { key: 'tipDebitmetru',      label: 'Tip Debitmetru',         type: 'text',   placeholder: 'ex. Electromagnetic, Ultrasonic' },
    { key: 'dn',                 label: 'DN',                     type: 'number', unit: 'mm' },
    { key: 'gamaMasuraLs',       label: 'Gamă Măsură',            type: 'text',   placeholder: 'ex. 0 … 50 l/s' },
    { key: 'semnalIesire',       label: 'Semnal Ieșire',          type: 'text',   placeholder: 'ex. 4-20 mA' },
    { key: 'iesireImpuls',       label: 'Ieșire Impuls',          type: 'boolean' },
    { key: 'valoareImpuls',      label: 'Valoare Impuls',         type: 'number', unit: 'm³/imp' },
    { key: 'precizie',           label: 'Precizie',               type: 'number', unit: '% citire' },
    { key: 'tensiuneAlim',       label: 'Tensiune Alimentare',    type: 'number', unit: 'V' },
    { key: 'gradProtectie',      label: 'Grad Protecție',         type: 'text',   placeholder: 'ex. IP68' },
    { key: 'pn',                 label: 'PN',                     type: 'number', unit: 'bar' },
    { key: 'materialTub',        label: 'Material Tub',           type: 'text',   placeholder: 'ex. Inox 316L' },
    { key: 'protocolComunicatie', label: 'Protocol Comunicație',  type: 'text',   placeholder: 'ex. Modbus RTU' },
  ],
  'Analizor de Rețea Electrică': [
    { key: 'tipAnalizor',        label: 'Tip Analizor',           type: 'text',   placeholder: 'ex. PAC3200' },
    { key: 'parametriMasurati',  label: 'Parametri Măsurați',     type: 'text',   placeholder: 'ex. U, I, P, Q, PF, Ep, Eq' },
    { key: 'clasaPrecizie',      label: 'Clasă Precizie',         type: 'text',   placeholder: 'ex. Clasa 0.5' },
    { key: 'gamaTensiune',       label: 'Gamă Tensiune',          type: 'text',   placeholder: 'ex. 57 … 690 V' },
    { key: 'gamaCurent',         label: 'Gamă Curent',            type: 'text',   placeholder: 'ex. 1 … 5 (TC) A' },
    { key: 'protocolComunicatie', label: 'Protocol Comunicație',  type: 'text',   placeholder: 'ex. Modbus TCP / Profibus' },
    { key: 'gradProtectie',      label: 'Grad Protecție',         type: 'text',   placeholder: 'ex. IP52 / IP20' },
    { key: 'tensiuneAlim',       label: 'Tensiune Alimentare',    type: 'number', unit: 'V' },
  ],
  'Dozator Clor': [
    { key: 'tipDozator',        label: 'Tip Dozator',            type: 'text',   placeholder: 'ex. Dozator gaz clor' },
    { key: 'debitMax',          label: 'Debit Max',              type: 'number', unit: 'g/h' },
    { key: 'debitMin',          label: 'Debit Min',              type: 'number', unit: 'g/h' },
    { key: 'gamaReglaj',        label: 'Gamă Reglaj',            type: 'text',   placeholder: 'ex. 10 … 1000 g/h' },
    { key: 'semnalComanda',     label: 'Semnal Comandă',         type: 'text',   placeholder: 'ex. 4-20 mA' },
    { key: 'semnalFeedback',    label: 'Semnal Feedback',        type: 'text',   placeholder: 'ex. 4-20 mA' },
    { key: 'tensiuneAlim',      label: 'Tensiune Alimentare',    type: 'text',   placeholder: 'ex. 230 AC' },
    { key: 'gradProtectie',     label: 'Grad Protecție',         type: 'text',   placeholder: 'ex. IP54' },
    { key: 'capacitateCilindru', label: 'Capacitate Cilindru',   type: 'number', unit: 'kg' },
  ],
  'Detector Clor în Aer': [
    { key: 'gamaMasura',     label: 'Gamă Măsură',              type: 'text',   placeholder: 'ex. 0 … 5 ppm Cl₂' },
    { key: 'pragAlarma',     label: 'Prag Alarmă',              type: 'number', unit: 'ppm' },
    { key: 'tipSenzor',      label: 'Tip Senzor',               type: 'text',   placeholder: 'ex. Electrochimic' },
    { key: 'semnalIesire',   label: 'Semnal Ieșire / Alarmă',   type: 'text',   placeholder: 'ex. Releu NO/NC' },
    { key: 'intervalCalib',  label: 'Interval Calibrare',       type: 'number', unit: 'luni' },
    { key: 'dataCalib',      label: 'Data Ultimei Calibrări',   type: 'date' },
    { key: 'gradProtectie',  label: 'Grad Protecție',           type: 'text',   placeholder: 'ex. IP54' },
  ],
  'PLC / RTU': [
    { key: 'tipCPU',               label: 'Tip CPU',                       type: 'text',   placeholder: 'ex. Siemens S7-1200' },
    { key: 'nrIntrariDigitale',    label: 'Nr. Intrări Digitale',          type: 'number', unit: 'buc' },
    { key: 'nrIesiriDigitale',     label: 'Nr. Ieșiri Digitale',           type: 'number', unit: 'buc' },
    { key: 'nrIntrariAnalogice',   label: 'Nr. Intrări Analogice',         type: 'number', unit: 'buc' },
    { key: 'nrIesiriAnalogice',    label: 'Nr. Ieșiri Analogice',          type: 'number', unit: 'buc' },
    { key: 'memorieProgram',       label: 'Memorie Program',               type: 'number', unit: 'bytes' },
    { key: 'memorieDate',          label: 'Memorie Date',                  type: 'number', unit: 'bytes' },
    { key: 'protocoaleCom',        label: 'Protocoale Comunicație',        type: 'text',   placeholder: 'ex. Profinet / Modbus / MPI', span: true },
    { key: 'tensiuneAlimentare',   label: 'Tensiune Alimentare',           type: 'number', unit: 'V' },
    { key: 'temperaturaLucru',     label: 'Temperatură Lucru',             type: 'text',   placeholder: 'ex. -30 … +50 °C' },
    { key: 'versiuneSoftware',     label: 'Versiune Software',             type: 'text' },
    { key: 'dataUltimaIncarcare',  label: 'Data Ultimei Încărcări Software', type: 'date' },
    { key: 'tipModemGSM',          label: 'Tip Modem GSM',                 type: 'text' },
    { key: 'nrSIM',                label: 'Nr. SIM',                       type: 'text' },
    { key: 'operatorGSM',          label: 'Operator GSM',                  type: 'text' },
  ],
  'HMI (Panou Operator)': [
    { key: 'tipDisplay',            label: 'Tip Display',             type: 'text',   placeholder: 'ex. TFT Touch Panel' },
    { key: 'diagonala',             label: 'Diagonală',               type: 'number', unit: 'inch' },
    { key: 'rezolutie',             label: 'Rezoluție',               type: 'text',   placeholder: 'ex. 800 × 400 px' },
    { key: 'sistemOperare',         label: 'Sistem Operare',          type: 'text',   placeholder: 'ex. Windows CE' },
    { key: 'gradProtectieFrontal',  label: 'Grad Protecție Frontal',  type: 'text',   placeholder: 'ex. IP65' },
    { key: 'interfataCom',          label: 'Interfață Comunicație',   type: 'text',   placeholder: 'ex. Ethernet RJ45 / Profinet' },
    { key: 'tensiuneAlimentare',    label: 'Tensiune Alimentare',     type: 'number', unit: 'V' },
    { key: 'versiuneAplicatie',     label: 'Versiune Aplicație',      type: 'text' },
  ],
  'UPS / Acumulator': [
    { key: 'tipBaterie',        label: 'Tip Baterie',                  type: 'text',   placeholder: 'ex. AGM / Gel' },
    { key: 'capacitate',        label: 'Capacitate',                   type: 'number', unit: 'Ah' },
    { key: 'tensiuneNominala',  label: 'Tensiune Nominală',            type: 'number', unit: 'V' },
    { key: 'autonomieMin',      label: 'Autonomie Min',                type: 'number', unit: 'ore' },
    { key: 'curentIncarcare',   label: 'Curent Încărcare',             type: 'number', unit: 'A' },
    { key: 'dataMontaj',        label: 'Data Montaj',                  type: 'date' },
    { key: 'durataViataEst',    label: 'Durată Viață Estimată',        type: 'number', unit: 'ani' },
    { key: 'dataInlocuirePlan', label: 'Data Înlocuire Planificată',   type: 'date' },
  ],
  'Panou Solar': [
    { key: 'putereNominala',    label: 'Putere Nominală (STC)',    type: 'number', unit: 'W' },
    { key: 'nrCelule',         label: 'Nr. Celule',               type: 'number', unit: 'buc' },
    { key: 'tensiuneIesire',    label: 'Tensiune Ieșire (Vmp)',    type: 'number', unit: 'V' },
    { key: 'curentMax',        label: 'Curent Max (Imp)',          type: 'number', unit: 'A' },
    { key: 'randament',        label: 'Randament',                 type: 'number', unit: '%' },
    { key: 'tipCelula',        label: 'Tip Celulă',               type: 'text',   placeholder: 'ex. Monocristalin' },
    { key: 'suprafata',        label: 'Suprafață',                 type: 'number', unit: 'm²' },
    { key: 'orientare',        label: 'Orientare / Înclinare',     type: 'text',   placeholder: 'ex. Sud / 35 grade' },
    { key: 'regulatorIncarcare', label: 'Regulator Încărcare',    type: 'text',   placeholder: 'ex. MPPT 800W' },
  ],
};

const EMPTY_GENERAL: EquipmentGeneralData = {
  cod: '', etichetaEchipament: '', denumire: '', pozitieSchema: '',
  tipEchipament: '', locatie: '', portofoliu: '', sistem: '', grup: '',
  responsabil: '', dataPunereFunctiune1: '', dataPunereFunctiune2: '',
  gestiune: '', grupa: '', subgrupa: '', parteMijlocFix: false,
  cotaParte: '', codObInv: '', serie: '', observatii: '',
  zona: '', purtator: '',
  furnizor: '', distribuitor: '', telefonService: '', nrContract: '',
  codDocFurn: '', nrDocFurn: '', dataDocFurn: '',
  garantieExpira: '', manualTehnicUrl: '',
  codDocPF: '', nrDocPF: '', dataDocPF: '',
  codDocMiscare: '', nrDocMiscare: '', dataDocMiscare: '',
  fabricant: '', anFabricatie: '', modelFabricatie: '', serieFabricatie: '',
};

interface Props {
  subscriptions: Subscription[];
  wsClient: WebSocketClient;
}

export function MetadataManager({ subscriptions, wsClient }: Props) {
  const [records, setRecords] = useState<EquipmentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<EquipmentRecord | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    wsClient.getMetadata()
      .then(data => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setRecords([]))
      .finally(() => setIsLoading(false));
  }, [wsClient]);

  const handleNew = () => {
    const id = `eq-${Date.now()}`;
    const now = new Date().toISOString();
    setEditData({
      id, tagId: '',
      general: { ...EMPTY_GENERAL },
      specific: {},
      createdAt: now, updatedAt: now,
    });
    setSelectedId(id);
    setIsDirty(true);
  };

  const handleSelect = (id: string) => {
    if (isDirty) {
      setPendingSelectId(id);
      return;
    }
    const record = records.find(r => r.id === id);
    if (record) {
      setEditData(JSON.parse(JSON.stringify(record)));
      setSelectedId(id);
      setIsDirty(false);
    }
  };

  const applyPendingSelect = (targetId: string) => {
    const record = records.find(r => r.id === targetId);
    if (record) {
      setEditData(JSON.parse(JSON.stringify(record)));
      setSelectedId(targetId);
      setIsDirty(false);
    } else {
      setEditData(null); setSelectedId(null); setIsDirty(false);
    }
    setPendingSelectId(null);
  };

  const handlePendingDiscard = () => {
    if (pendingSelectId) applyPendingSelect(pendingSelectId);
  };

  const handlePendingSave = async () => {
    const targetId = pendingSelectId;
    await handleSave();
    if (targetId) applyPendingSelect(targetId);
  };

  const handleSave = async () => {
    if (!editData) return;
    const updated = { ...editData, updatedAt: new Date().toISOString() };
    const exists = records.some(r => r.id === updated.id);
    const next = exists ? records.map(r => r.id === updated.id ? updated : r) : [...records, updated];
    setSaveStatus('saving');
    try {
      await wsClient.saveMetadata(next);
      setRecords(next);
      setEditData(updated);
      setIsDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    setDeleteConfirmId(null);
    const next = records.filter(r => r.id !== id);
    try {
      await wsClient.saveMetadata(next);
      setRecords(next);
      if (selectedId === id) { setSelectedId(null); setEditData(null); setIsDirty(false); }
    } catch {
      console.error('Failed to delete metadata record');
    }
  };

  const handleDiscard = () => {
    const persisted = records.find(r => r.id === selectedId);
    if (persisted) {
      setEditData(JSON.parse(JSON.stringify(persisted)));
    } else {
      setEditData(null); setSelectedId(null);
    }
    setIsDirty(false);
  };

  const setGeneral = (key: string, value: string | boolean) => {
    if (!editData) return;
    const updatedGeneral = { ...editData.general, [key]: value };
    if (key === 'tipEchipament') {
      const schema = EQUIPMENT_SCHEMAS[value as EquipmentType] ?? [];
      const emptySpecific: Record<string, string | boolean> = {};
      schema.forEach(f => { emptySpecific[f.key] = f.type === 'boolean' ? false : ''; });
      setEditData({ ...editData, general: updatedGeneral, specific: emptySpecific });
    } else {
      setEditData({ ...editData, general: updatedGeneral });
    }
    setIsDirty(true);
  };

  const setSpecific = (key: string, value: string | boolean) => {
    if (!editData) return;
    setEditData({ ...editData, specific: { ...editData.specific, [key]: value } });
    setIsDirty(true);
  };

  const renderField = (
    field: FieldConfig,
    value: string | boolean | undefined,
    onChange: (key: string, val: string | boolean) => void
  ) => {
    const val = value ?? (field.type === 'boolean' ? false : '');
    const cls = `meta-field${field.span ? ' meta-field--span' : ''}`;

    if (field.type === 'boolean') {
      return (
        <div key={field.key} className={cls + ' meta-field--bool'}>
          <label className="meta-label-bool">
            <input type="checkbox" checked={val as boolean}
              onChange={e => onChange(field.key, e.target.checked)} />
            {field.label}
          </label>
        </div>
      );
    }
    if (field.type === 'textarea') {
      return (
        <div key={field.key} className={cls}>
          <label className="meta-label">{field.label}</label>
          <textarea className="meta-input meta-textarea" value={val as string}
            placeholder={field.placeholder} rows={3}
            onChange={e => onChange(field.key, e.target.value)} />
        </div>
      );
    }
    if (field.type === 'select' && field.options) {
      return (
        <div key={field.key} className={cls}>
          <label className="meta-label">{field.label}</label>
          <select className="meta-input" value={val as string}
            onChange={e => onChange(field.key, e.target.value)}>
            <option value="">— selectează —</option>
            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div key={field.key} className={cls}>
        <label className="meta-label">
          {field.label}
          {field.unit && <span className="meta-unit">{field.unit}</span>}
        </label>
        <input className="meta-input" type={field.type === 'date' ? 'date' : 'text'}
          value={val as string} placeholder={field.placeholder}
          onChange={e => onChange(field.key, e.target.value)} />
      </div>
    );
  };

  const filteredRecords = records.filter(r => {
    const t = searchTerm.toLowerCase();
    return r.general.cod.toLowerCase().includes(t)
      || r.general.denumire.toLowerCase().includes(t)
      || r.general.tipEchipament.toLowerCase().includes(t)
      || r.general.locatie.toLowerCase().includes(t);
  });

  const specificSchema = editData ? (EQUIPMENT_SCHEMAS[editData.general.tipEchipament] ?? []) : [];

  return (
    <div className="metadata-manager">

      {/* ── SIDEBAR ── */}
      <div className="meta-sidebar">
        <div className="meta-sidebar-header">
          <span className="meta-sidebar-title">Echipamente</span>
          <button className="meta-btn meta-btn--primary meta-btn--sm" onClick={handleNew}>+ Nou</button>
        </div>
        <div className="meta-search-wrap">
          <input className="meta-search" type="text" placeholder="Caută echipament..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="meta-list">
          {filteredRecords.length === 0 && (
            <div className="meta-list-empty">
              {records.length === 0 ? 'Niciun echipament. Apasă + Nou.' : 'Niciun rezultat.'}
            </div>
          )}
          {filteredRecords.map(r => (
            <div key={r.id}
              className={`meta-list-item${selectedId === r.id ? ' meta-list-item--active' : ''}`}
              onClick={() => handleSelect(r.id)}>
              <div className="meta-list-item-main">
                <span className="meta-list-cod">{r.general.cod || '(fără cod)'}</span>
                <span className="meta-list-name">{r.general.denumire || '(fără denumire)'}</span>
              </div>
              <div className="meta-list-item-sub">
                {r.general.tipEchipament && <span className="meta-list-type">{r.general.tipEchipament}</span>}
                {r.general.locatie && <span className="meta-list-loc">{r.general.locatie}</span>}
              </div>
              {deleteConfirmId === r.id ? (
                <div className="meta-list-delete-confirm" onClick={e => e.stopPropagation()}>
                  <span>Ștergi?</span>
                  <button className="meta-list-confirm-yes" onClick={e => { e.stopPropagation(); handleDelete(r.id); }}>Da</button>
                  <button className="meta-list-confirm-no" onClick={e => { e.stopPropagation(); setDeleteConfirmId(null); }}>Nu</button>
                </div>
              ) : (
                <button className="meta-list-delete" title="Șterge"
                  onClick={e => { e.stopPropagation(); handleDelete(r.id); }}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── PANOU FORMULAR ── */}
      <div className="meta-content">
        {isLoading ? (
          <div className="meta-empty-state">
            <p>Se încarcă metadatele...</p>
          </div>
        ) : !editData ? (
          <div className="meta-empty-state">
            <div className="meta-empty-icon">📋</div>
            <p>Selectează un echipament sau creează unul nou.</p>
            <button className="meta-btn meta-btn--primary" onClick={handleNew}>+ Echipament Nou</button>
          </div>
        ) : (
          <>
            {/* Unsaved changes warning — shown when user clicks a different record while dirty */}
            {pendingSelectId && (
              <div className="meta-unsaved-warning">
                <span>Ai modificări nesalvate. Ce dorești să faci?</span>
                <div className="meta-unsaved-actions">
                  <button className="meta-btn meta-btn--ghost meta-btn--sm" onClick={() => setPendingSelectId(null)}>Anulare</button>
                  <button className="meta-btn meta-btn--ghost meta-btn--sm" onClick={handlePendingDiscard}>Abandonează</button>
                  <button className="meta-btn meta-btn--primary meta-btn--sm" onClick={handlePendingSave}>Salvează și continuă</button>
                </div>
              </div>
            )}
            {/* Toolbar */}
            <div className="meta-toolbar">
              <div className="meta-toolbar-title">
                {editData.general.denumire || 'Echipament nou'}
                {isDirty && <span className="meta-dirty-badge">nesalvat</span>}
              </div>
              <div className="meta-toolbar-actions">
                {isDirty && <button className="meta-btn meta-btn--ghost" onClick={handleDiscard}>Renunță</button>}
                <button
                  className="meta-btn meta-btn--primary"
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? 'Se salvează...' : saveStatus === 'saved' ? 'Salvat ✓' : saveStatus === 'error' ? 'Eroare ✕' : 'Salvează'}
                </button>
              </div>
            </div>

            <div className="meta-form-scroll">

              {/* ── 1. TIP ECHIPAMENT ── */}
              <div className="meta-block">
                <div className="meta-block-title meta-block-title--type">Tip Echipament</div>
                <div className="meta-grid">
                  <div className="meta-field meta-field--span">
                    <label className="meta-label">Categorie / Tip</label>
                    <select className="meta-input meta-input--type"
                      value={editData.general.tipEchipament}
                      onChange={e => setGeneral('tipEchipament', e.target.value as EquipmentType)}>
                      <option value="">— selectează tip echipament —</option>
                      {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── 2. CARACTERISTICI SPECIFICE (apare când tipul e selectat) ── */}
              {specificSchema.length > 0 && (
                <div className="meta-block meta-block--specific">
                  <div className="meta-block-title">
                    Caracteristici Specifice — {editData.general.tipEchipament}
                  </div>
                  <div className="meta-grid">
                    {specificSchema.map(field =>
                      renderField(field, editData.specific[field.key] as string | boolean | undefined, setSpecific)
                    )}
                  </div>
                </div>
              )}

              {/* ── 3. METADATE GENERALE ── */}
              <div className="meta-block">
                <div className="meta-block-title">Generale</div>
                <div className="meta-grid">
                  <div className="meta-field meta-field--bool">
                    <label className="meta-label-bool">
                      <input type="checkbox" checked={editData.general.parteMijlocFix}
                        onChange={e => setGeneral('parteMijlocFix', e.target.checked)} />
                      Parte dintr-un Mijloc Fix
                    </label>
                  </div>
                  {GENERAL_FIELDS.map(f =>
                    renderField(f, editData.general[f.key as keyof EquipmentGeneralData] as string | boolean | undefined, setGeneral)
                  )}
                </div>
              </div>

              {/* ── 4. DATE FABRICAȚIE ── */}
              <div className="meta-block">
                <div className="meta-block-title">Date Fabricație</div>
                <div className="meta-grid">
                  {FABRICATIE_FIELDS.map(f =>
                    renderField(f, editData.general[f.key as keyof EquipmentGeneralData] as string | boolean | undefined, setGeneral)
                  )}
                </div>
              </div>

              {/* ── 5. OBIECTE DE COST ── */}
              <div className="meta-block">
                <div className="meta-block-title">Obiecte de Cost</div>
                <div className="meta-grid">
                  {COSTURI_FIELDS.map(f =>
                    renderField(f, editData.general[f.key as keyof EquipmentGeneralData] as string | boolean | undefined, setGeneral)
                  )}
                </div>
              </div>

              {/* ── 6. DOCUMENTE ── */}
              <div className="meta-block">
                <div className="meta-block-title">Documente</div>
                <div className="meta-grid">
                  {DOCUMENTE_FIELDS.map(f =>
                    renderField(f, editData.general[f.key as keyof EquipmentGeneralData] as string | boolean | undefined, setGeneral)
                  )}
                </div>
              </div>

              {/* ── 7. ASOCIERE TAG OPC UA ── */}
              <div className="meta-block">
                <div className="meta-block-title">Asociere Tag OPC UA</div>
                <div className="meta-grid">
                  <div className="meta-field meta-field--span">
                    <label className="meta-label">Node ID Tag OPC UA</label>
                    <input className="meta-input" type="text" value={editData.tagId}
                      placeholder="ex. ns=2;s=Channel1.PLC2.Debit_Pump1"
                      onChange={e => { setEditData({ ...editData, tagId: e.target.value }); setIsDirty(true); }} />
                  </div>
                  {subscriptions.length > 0 && (
                    <div className="meta-field meta-field--span">
                      <label className="meta-label">Alege din subscripții active</label>
                      <select className="meta-input" value=""
                        onChange={e => { if (e.target.value) { setEditData({ ...editData, tagId: e.target.value }); setIsDirty(true); } }}>
                        <option value="">— selectează —</option>
                        {subscriptions.map(s => (
                          <option key={s.tagId} value={s.tagId}>{s.tagName} — {s.tagId}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="meta-form-footer">
                <span className="meta-timestamp">
                  Creat: {new Date(editData.createdAt).toLocaleString('ro-RO')}
                  {editData.updatedAt !== editData.createdAt && (
                    <> · Actualizat: {new Date(editData.updatedAt).toLocaleString('ro-RO')}</>
                  )}
                </span>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
