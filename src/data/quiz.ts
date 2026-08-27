import { asset } from '../lib/asset'

export type Choice = 'A' | 'B' | 'C'

export interface Question {
  /** Two-digit number as printed in the quiz, e.g. "01". */
  id: string
  part: Part
  prompt: string
  options: Record<Choice, string>
  answer: Choice
  /** The facit line, without the leading letter. */
  explanation: string
}

export interface Part {
  label: string
  title: string
  image: string
  caption: string
}

const PART_ONE: Part = {
  label: 'Del ett · Frågor 1–5',
  title: 'Staden och havet',
  image: asset('img/stadsmuren.jpg'),
  caption: 'Stadsmuren mot väst · Knappt två kilometer runt',
}

const PART_TWO: Part = {
  label: 'Del två · Frågor 6–10',
  title: 'Murar, gator och öar',
  image: asset('img/lokrum.jpg'),
  caption: 'Lokrum · Tio minuter med båt från Gamla hamnen',
}

const PART_THREE: Part = {
  label: 'Del tre · Frågor 11–15',
  title: 'Helgon, mynt och detaljer',
  image: asset('img/dubrovnik-aerial.jpg'),
  caption: 'Gamla stan från luften · Perla Jadrana',
}

export const questions: Question[] = [
  {
    id: '01',
    part: PART_ONE,
    prompt: 'I vilket land ligger Dubrovnik?',
    options: { A: 'Slovenien', B: 'Kroatien', C: 'Montenegro' },
    answer: 'B',
    explanation: 'Kroatien — längst söderut i Dalmatien.',
  },
  {
    id: '02',
    part: PART_ONE,
    prompt: 'Vilket hav ligger staden vid?',
    options: { A: 'Egeiska havet', B: 'Joniska havet', C: 'Adriatiska havet' },
    answer: 'C',
    explanation: 'Adriatiska havet.',
  },
  {
    id: '03',
    part: PART_ONE,
    prompt: 'Gamla stan blev UNESCO-världsarv år …',
    options: { A: '1949', B: '1979', C: '1999' },
    answer: 'B',
    explanation: '1979.',
  },
  {
    id: '04',
    part: PART_ONE,
    prompt: 'Vad hette den självständiga sjörepublik som styrde staden fram till 1808?',
    options: { A: 'Republiken Ragusa', B: 'Republiken Venedig', C: 'Republiken Zadar' },
    answer: 'A',
    explanation: 'Republiken Ragusa — upplöst av Napoleon 1808.',
  },
  {
    id: '05',
    part: PART_ONE,
    prompt: 'Vilken HBO-serie filmade sin huvudstad King’s Landing här?',
    options: { A: 'Rome', B: 'Game of Thrones', C: 'The White Lotus' },
    answer: 'B',
    explanation: 'Game of Thrones.',
  },
  {
    id: '06',
    part: PART_TWO,
    prompt: 'Hur långa är stadsmurarna runt gamla stan?',
    options: { A: 'Cirka 940 m', B: 'Cirka 1 940 m', C: 'Cirka 3 940 m' },
    answer: 'B',
    explanation: 'Cirka 1 940 m — knappt två kilometers rundvandring.',
  },
  {
    id: '07',
    part: PART_TWO,
    prompt: 'Vad heter paradgatan rakt genom gamla stan?',
    options: { A: 'Riva', B: 'Korzo', C: 'Stradun' },
    answer: 'C',
    explanation: 'Stradun, även kallad Placa.',
  },
  {
    id: '08',
    part: PART_TWO,
    prompt: 'Vilket berg reser sig bakom staden och nås med linbana?',
    options: { A: 'Srđ', B: 'Biokovo', C: 'Marjan' },
    answer: 'A',
    explanation: 'Srđ, 412 meter över havet.',
  },
  {
    id: '09',
    part: PART_TWO,
    prompt: 'Vilken bilfri, skogsklädd ö ligger tio minuter med båt från Gamla hamnen?',
    options: { A: 'Mljet', B: 'Hvar', C: 'Lokrum' },
    answer: 'C',
    explanation: 'Lokrum — påfåglar, klippbad och botanisk trädgård.',
  },
  {
    id: '10',
    part: PART_TWO,
    prompt: 'Vilket år ödelade en jordbävning stora delar av staden?',
    options: { A: '1520', B: '1667', C: '1806' },
    answer: 'B',
    explanation: '1667 — därför är mycket av gamla stan barock, inte gotik.',
  },
  {
    id: '11',
    part: PART_THREE,
    prompt: 'Vem är stadens skyddshelgon, firad varje 3 februari?',
    options: {
      A: 'Sankt Blasius (Sveti Vlaho)',
      B: 'Sankt Markus',
      C: 'Sankt Nikolaus',
    },
    answer: 'A',
    explanation: 'Sankt Blasius — Sveti Vlaho, stadens ansikte sedan 972.',
  },
  {
    id: '12',
    part: PART_THREE,
    prompt: 'Vilken valuta betalar du med i Kroatien sedan 2023?',
    options: { A: 'Kuna', B: 'Euro', C: 'Dinar' },
    answer: 'B',
    explanation: 'Euro — infördes 1 januari 2023.',
  },
  {
    id: '13',
    part: PART_THREE,
    prompt: 'Vilket fort vaktar staden från en klippa strax väster om murarna?',
    options: { A: 'Bokar', B: 'Lovrijenac', C: 'Revelin' },
    answer: 'B',
    explanation: 'Lovrijenac, ”Dubrovniks Gibraltar”.',
  },
  {
    id: '14',
    part: PART_THREE,
    prompt: 'Apoteket i franciskanerklostret är ett av Europas äldsta. Från vilket år?',
    options: { A: '1317', B: '1517', C: '1717' },
    answer: 'A',
    explanation: '1317 — fortfarande i drift.',
  },
  {
    id: '15',
    part: PART_THREE,
    prompt: 'Vad heter porten i Straduns västra ände, där de flesta går in?',
    options: { A: 'Pločeporten', B: 'Pileporten', C: 'Bužaporten' },
    answer: 'B',
    explanation: 'Pileporten — Vrata od Pila.',
  },
]

export const bonus = {
  label: 'Bonusfråga · 2 poäng',
  prompt: 'Hur säger man ”skål” på kroatiska?',
  answer: 'Živjeli!',
  explanation: 'Živjeli! Bonusfrågan ger två poäng.',
}

export interface Tier {
  range: string
  text: string
}

export const tiers: Tier[] = [
  { range: '0–5 poäng', text: 'Du reser dit med öppna ögon. Boka guidad tur.' },
  { range: '6–11 poäng', text: 'Solid resenär. Muren runt, och du klarar dig.' },
  { range: '12–17 poäng', text: 'Ragusansk hedersmedborgare. Du leder gruppen.' },
]
