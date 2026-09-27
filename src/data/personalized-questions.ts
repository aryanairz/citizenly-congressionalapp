/**
 * Generates personalized civics questions based on the user's place (state,
 * Washington D.C., or a U.S. territory) & district.
 * Injected into the question pool for logged-in users who have a place set.
 *
 * Branching by `kind`:
 *  - state:     Governor, two Senators, district Representative, Capital.
 *  - territory: Governor + Capital (real), but "no U.S. Senators" and
 *               "no voting U.S. Representative" answers.
 *  - district:  D.C. - "no Governor / no Senators / no capital / no voting Rep".
 */

import { Question, BilingualText, Lang } from "@/data/question-types";
import type { StateData } from "@/data/state-data-types";
import { allPlaces } from "@/data/representatives";

export function getPersonalizedQuestions(
  stateCode: string,
  district?: number,
): Question[] {
  const state = allPlaces[stateCode];
  if (!state) return [];

  const kind = state.kind ?? "state";
  const questions: Question[] = [];

  // ── 1. Governor question ──────────────────────────
  if (state.governor) {
    questions.push(governorQuestion(state.name, state.governor, stateCode));
  } else {
    questions.push(noGovernorQuestion(state.name, stateCode)); // D.C.
  }

  // ── 2. Senator question(s) ────────────────────────
  if (state.senators) {
    for (let si = 0; si < 2; si++) {
      questions.push(senatorQuestion(state.name, state.senators, si, stateCode));
    }
  } else {
    questions.push(noSenatorQuestion(state, stateCode)); // D.C. + territories
  }

  // ── 3. U.S. Representative question ────────────────
  if (kind === "state") {
    if (district !== undefined && state.districts[district]) {
      questions.push(repQuestion(state.name, state.districts[district], stateCode, district));
    }
  } else {
    questions.push(noRepQuestion(state, stateCode)); // D.C. + territories (no district lookup)
  }

  // ── 4. Capital question ───────────────────────────
  if (state.capital) {
    questions.push(capitalQuestion(state.name, state.capital, stateCode));
  } else {
    questions.push(noCapitalQuestion(state.name, stateCode)); // D.C.
  }

  return questions.map(addPortugueseToPersonalizedQuestion);
}

function addPortugueseToPersonalizedQuestion(question: Question): Question {
  const localize = (text: BilingualText): BilingualText => ({
    ...text,
    pt: text.pt ?? translatePersonalizedTextToPortuguese(text.en),
  });

  return {
    ...question,
    question: localize(question.question),
    options: question.options.map(localize),
    explanation: localize(question.explanation),
  };
}

function translatePersonalizedTextToPortuguese(en: string): string {
  const exact: Record<string, string> = {
    "D.C. does not have a Governor": "D.C. não tem governador",
    "Washington, D.C. is not a state, so it does not have a Governor.": "Washington, D.C. não é um estado, portanto não tem governador.",
    "D.C. does not have U.S. Senators": "D.C. não tem senadores dos EUA",
    "Washington, D.C. is not a state, so it has no U.S. Senators.": "Washington, D.C. não é um estado, portanto não tem senadores dos EUA.",
    "D.C. has no voting U.S. Representative": "D.C. não tem representante dos EUA com direito a voto",
    "Washington, D.C. has no voting U.S. Representative; it is represented by a non-voting Delegate in the House.": "Washington, D.C. não tem representante dos EUA com direito a voto; é representado por um delegado sem direito a voto na Câmara.",
    "D.C. is not a state and does not have a capital": "D.C. não é um estado e não tem uma capital estadual",
    "Washington, D.C. is a federal district, not a state, so it does not have a state capital.": "Washington, D.C. é um distrito federal, não um estado, portanto não tem uma capital estadual.",
    "At-Large": "Todo o estado",
  };
  if (exact[en]) return exact[en];

  let match = en.match(/^Who is the Governor of (.+)\?$/);
  if (match) return `Quem é o governador de ${match[1]}?`;
  match = en.match(/^(.+) is the current Governor of (.+)\.$/);
  if (match) return `${match[1]} é o atual governador de ${match[2]}.`;
  match = en.match(/^Who is one of your state's U\.S\. Senators\? \((.+)\)$/);
  if (match) return `Quem é um dos senadores dos EUA do seu estado? (${match[1]})`;
  match = en.match(/^(.+) and (.+) are the U\.S\. Senators from (.+)\.$/);
  if (match) return `${match[1]} e ${match[2]} são os senadores dos EUA por ${match[3]}.`;
  match = en.match(/^Who is your U\.S\. Representative\? \((.+)\)$/);
  if (match) return `Quem é o seu representante dos EUA? (${match[1].replace("At-Large", "Todo o estado").replace(/District (\d+)/, "Distrito $1")})`;
  match = en.match(/^(.+) is the U\.S\. Representative for (.+) (At-Large|District \d+)\.$/);
  if (match) return `${match[1]} é o representante dos EUA por ${match[2]}, ${match[3].replace("At-Large", "todo o estado").replace("District", "Distrito")}.`;
  match = en.match(/^What is the capital of (.+)\?$/);
  if (match) return `Qual é a capital de ${match[1]}?`;
  match = en.match(/^(.+) is the capital of (.+)\.$/);
  if (match) return `${match[1]} é a capital de ${match[2]}.`;
  match = en.match(/^(.+) has no U\.S\. Senators$/);
  if (match) return `${match[1]} não tem senadores dos EUA`;
  match = en.match(/^(.+) is a U\.S\. territory, not a state, so it has no U\.S\. Senators\.$/);
  if (match) return `${match[1]} é um território dos EUA, não um estado, portanto não tem senadores dos EUA.`;
  match = en.match(/^(.+) has no voting U\.S\. Representative$/);
  if (match) return `${match[1]} não tem representante dos EUA com direito a voto`;
  match = en.match(/^(.+) is a U\.S\. territory, so it has no voting U\.S\. Representative in Congress\.$/);
  if (match) return `${match[1]} é um território dos EUA, portanto não tem representante dos EUA com direito a voto no Congresso.`;
  match = en.match(/^District (\d+)$/);
  if (match) return `Distrito ${match[1]}`;

  return en;
}

// ════════════════════════════════════════════════════════════════════════
//  Normal (state / territory) question builders
// ════════════════════════════════════════════════════════════════════════

function governorQuestion(name: string, governor: string, stateCode: string): Question {
  return {
    id: `p_gov_${stateCode}`,
    topic: "government",
    is6520: true,
    question: {
      en: `Who is the Governor of ${name}?`,
      sq: `Kush është guvernatori i ${name}?`,
      ml: `${name}-ന്റെ ഗവർണർ ആരാണ്?`,
      gu: `${name}ના ગવર્નર કોણ છે?`,
      vi: `Thống đốc của ${name} là ai?`,
      tl: `Sino ang Gobernador ng ${name}?`,
      es: `¿Quién es el Gobernador de ${name}?`,
      hmn: `Leej twg yog Tus Kav Xeev ntawm ${name}?`,
      ko: `${name}의 주지사는 누구입니까?`,
      ru: `Кто губернатор штата ${name}?`,
      hi: `${name} के गवर्नर कौन हैं?`,
      no: `Hvem er guvernøren i ${name}?`,
      fr: `Qui est le gouverneur de ${name} ?`,
      uk: `Хто є губернатором штату ${name}?`,
      de: `Wer ist der Gouverneur von ${name}?`,
      pt: `Quem é o governador de ${name}?`,
      it: `Chi è il governatore di ${name}?`,
      zh: `${name} 州的州长是谁？`,
      pl: `Kto jest gubernatorem stanu ${name}?`,
      el: `Ποιος είναι ο Κυβερνήτης της πολιτείας ${name};`,
    },
    options: buildGovernorOptions(governor),
    correctIndex: 0,
    explanation: {
      en: `${governor} is the current Governor of ${name}.`,
      sq: `${governor} është guvernatori aktual i ${name}.`,
      ml: `${governor} ആണ് ${name}-ന്റെ ഇപ്പോഴത്തെ ഗവർണർ.`,
      gu: `${governor} ${name}ના વર્તમાન ગવર્નર છે.`,
      vi: `${governor} là Thống đốc hiện tại của ${name}.`,
      tl: `Si ${governor} ang kasalukuyang Gobernador ng ${name}.`,
      es: `${governor} es el actual Gobernador de ${name}.`,
      hmn: `${governor} yog Tus Kav Xeev tam sim no ntawm ${name}.`,
      ko: `${governor}이(가) ${name}의 현재 주지사입니다.`,
      ru: `${governor} - действующий губернатор штата ${name}.`,
      hi: `${governor} ${name} के वर्तमान गवर्नर हैं।`,
      no: `${governor} er den nåværende guvernøren i ${name}.`,
      fr: `${governor} est l'actuel gouverneur de ${name}.`,
      uk: `${governor} - чинний губернатор штату ${name}.`,
      de: `${governor} ist derzeit Gouverneur von ${name}.`,
      pt: `${governor} é o atual governador de ${name}.`,
      it: `${governor} è l'attuale governatore di ${name}.`,
      zh: `${governor} 是 ${name} 州的现任州长。`,
      pl: `${governor} jest obecnym gubernatorem stanu ${name}.`,
      el: `Ο/Η ${governor} είναι ο σημερινός Κυβερνήτης της πολιτείας ${name}.`,
    },
  };
}

function senatorQuestion(name: string, senators: [string, string], si: number, stateCode: string): Question {
  const correctSenator = senators[si];
  const otherSenator = senators[1 - si];
  return {
    id: `p_sen${si}_${stateCode}`,
    topic: "government",
    question: {
      en: `Who is one of your state's U.S. Senators? (${name})`,
      sq: `Kush është një nga senatorët amerikanë të shtetit tuaj? (${name})`,
      ml: `നിങ്ങളുടെ സംസ്ഥാനത്തെ യു.എസ്. സെനറ്റർമാരിൽ ഒരാൾ ആരാണ്? (${name})`,
      gu: `તમારા રાજ્યના યુ.એસ. સેનેટરોમાંથી એક કોણ છે? (${name})`,
      vi: `Ai là một trong các Thượng nghị sĩ Hoa Kỳ của tiểu bang bạn? (${name})`,
      tl: `Sino ang isa sa mga U.S. Senator ng iyong estado? (${name})`,
      es: `¿Quién es uno de los Senadores de EE. UU. de su estado? (${name})`,
      hmn: `Leej twg yog ib tug ntawm koj lub xeev cov Senator Meskas? (${name})`,
      ko: `당신의 주의 미국 상원의원 중 한 명은 누구입니까? (${name})`,
      ru: `Кто один из сенаторов США от вашего штата? (${name})`,
      hi: `आपके राज्य के अमेरिकी सीनेटरों में से एक कौन हैं? (${name})`,
      no: `Hvem er en av delstatens amerikanske senatorer? (${name})`,
      fr: `Qui est l'un des sénateurs américains de votre État ? (${name})`,
      uk: `Назвіть одного із сенаторів США від вашого штату? (${name})`,
      de: `Wer ist einer der US-Senatoren Ihres Bundesstaates? (${name})`,
      pt: `Quem é um dos senadores dos EUA pelo seu estado? (${name})`,
      it: `Chi è uno dei senatori degli Stati Uniti del tuo stato? (${name})`,
      zh: `您所在州的一位联邦参议员是谁？（${name}）`,
      pl: `Kto jest jednym z senatorów USA z Pana/Pani stanu? (${name})`,
      el: `Ποιος είναι ένας από τους Γερουσιαστές των ΗΠΑ της πολιτείας σας; (${name})`,
    },
    options: buildSenatorOptions(correctSenator, otherSenator),
    correctIndex: 0,
    explanation: {
      en: `${senators[0]} and ${senators[1]} are the U.S. Senators from ${name}.`,
      sq: `${senators[0]} dhe ${senators[1]} janë senatorët amerikanë nga ${name}.`,
      ml: `${senators[0]}-ഉം ${senators[1]}-ഉം ${name}-ൽ നിന്നുള്ള യു.എസ്. സെനറ്റർമാരാണ്.`,
      gu: `${senators[0]} અને ${senators[1]} ${name}ના યુ.એસ. સેનેટર છે.`,
      vi: `${senators[0]} và ${senators[1]} là các Thượng nghị sĩ Hoa Kỳ từ ${name}.`,
      tl: `Sina ${senators[0]} at ${senators[1]} ang mga U.S. Senator mula sa ${name}.`,
      es: `${senators[0]} y ${senators[1]} son los Senadores de EE. UU. de ${name}.`,
      hmn: `${senators[0]} thiab ${senators[1]} yog cov Senator Meskas los ntawm ${name}.`,
      ko: `${senators[0]}와(과) ${senators[1]}이(가) ${name}의 미국 상원의원입니다.`,
      ru: `${senators[0]} и ${senators[1]} - сенаторы США от штата ${name}.`,
      hi: `${senators[0]} और ${senators[1]} ${name} से अमेरिकी सीनेटर हैं।`,
      no: `${senators[0]} og ${senators[1]} er de amerikanske senatorene fra ${name}.`,
      fr: `${senators[0]} et ${senators[1]} sont les sénateurs américains de ${name}.`,
      uk: `${senators[0]} і ${senators[1]} - сенатори США від штату ${name}.`,
      de: `${senators[0]} und ${senators[1]} sind die US-Senatoren von ${name}.`,
      pt: `${senators[0]} e ${senators[1]} são os senadores dos EUA por ${name}.`,
      it: `${senators[0]} e ${senators[1]} sono i senatori degli Stati Uniti di ${name}.`,
      zh: `${senators[0]} 和 ${senators[1]} 是 ${name} 州的联邦参议员。`,
      pl: `${senators[0]} i ${senators[1]} są senatorami USA ze stanu ${name}.`,
      el: `Ο/Η ${senators[0]} και ο/η ${senators[1]} είναι οι Γερουσιαστές των ΗΠΑ από την πολιτεία ${name}.`,
    },
  };
}

function repQuestion(name: string, rep: string, stateCode: string, district: number): Question {
  const dl = districtLabels(district);
  return {
    id: `p_rep_${stateCode}_${district}`,
    topic: "government",
    question: {
      en: `Who is your U.S. Representative? (${name}, ${dl.en})`,
      sq: `Kush është përfaqësuesi juaj amerikan? (${name}, ${dl.sq})`,
      ml: `നിങ്ങളുടെ യു.എസ്. പ്രതിനിധി ആരാണ്? (${name}, ${dl.ml})`,
      gu: `તમારા યુ.એસ. પ્રતિનિધિ કોણ છે? (${name}, ${dl.gu})`,
      vi: `Dân biểu Hoa Kỳ của bạn là ai? (${name}, ${dl.vi})`,
      tl: `Sino ang iyong U.S. Representative? (${name}, ${dl.tl})`,
      es: `¿Quién es su Representante ante el Congreso de EE. UU.? (${name}, ${dl.es})`,
      hmn: `Leej twg yog koj Tus Sawv Cev Meskas? (${name}, ${dl.hmn})`,
      ko: `당신의 미국 하원의원은 누구입니까? (${name}, ${dl.ko})`,
      ru: `Кто ваш представитель в Конгрессе США? (${name}, ${dl.ru})`,
      hi: `अमेरिकी कांग्रेस में आपके प्रतिनिधि कौन हैं? (${name}, ${dl.hi})`,
      no: `Hvem er din representant i Kongressen? (${name}, ${dl.no})`,
      fr: `Qui est votre représentant américain ? (${name}, ${dl.fr})`,
      uk: `Хто є вашим представником у Палаті представників США? (${name}, ${dl.en})`,
      de: `Wer ist Ihr US-Abgeordneter? (${name}, ${dl.de})`,
      pt: `Quem é o seu representante nos EUA? (${name}, ${dl.pt})`,
      it: `Chi è il tuo rappresentante negli Stati Uniti? (${name}, ${dl.it})`,
      zh: `您的联邦众议员是谁？（${name}，${dl.zh}）`,
      pl: `Kto jest Pana/Pani przedstawicielem w Kongresie USA? (${name}, ${dl.pl})`,
      el: `Ποιος είναι ο εκπρόσωπός σας στη Βουλή των ΗΠΑ; (${name}, ${dl.el})`,
    },
    options: buildRepOptions(rep),
    correctIndex: 0,
    explanation: {
      en: `${rep} is the U.S. Representative for ${name} ${dl.en}.`,
      sq: `${rep} është përfaqësuesi amerikan për ${name} ${dl.sq}.`,
      ml: `${rep} ആണ് ${name} ${dl.ml}-ന്റെ യു.എസ്. പ്രതിനിധി.`,
      gu: `${rep} ${name} ${dl.gu}ના યુ.એસ. પ્રતિનિધિ છે.`,
      vi: `${rep} là Dân biểu Hoa Kỳ đại diện cho ${name} ${dl.vi}.`,
      tl: `Si ${rep} ang U.S. Representative para sa ${name} ${dl.tl}.`,
      es: `${rep} es el Representante ante el Congreso de EE. UU. por ${name}, ${dl.es}.`,
      hmn: `${rep} yog Tus Sawv Cev Meskas rau ${name} ${dl.hmn}.`,
      ko: `${rep}이(가) ${name} ${dl.ko}의 미국 하원의원입니다.`,
      ru: `${rep} - представитель США от штата ${name}, ${dl.ru}.`,
      hi: `${rep} ${name}, ${dl.hi} के अमेरिकी प्रतिनिधि हैं।`,
      no: `${rep} er representanten i Kongressen for ${name} ${dl.no}.`,
      fr: `${rep} est le représentant américain de ${name}, ${dl.fr}.`,
      uk: `${rep} - представник у Палаті представників США від ${name} ${dl.en}.`,
      de: `${rep} ist der US-Abgeordnete für ${name}, ${dl.de}.`,
      pt: `${rep} é o representante dos EUA por ${name}, ${dl.pt}.`,
      it: `${rep} è il rappresentante degli Stati Uniti di ${name}, ${dl.it}.`,
      zh: `${rep} 是 ${name} ${dl.zh} 的联邦众议员。`,
      pl: `${rep} jest przedstawicielem USA dla stanu ${name}, ${dl.pl}.`,
      el: `Ο/Η ${rep} είναι ο εκπρόσωπος των ΗΠΑ για την πολιτεία ${name}, ${dl.el}.`,
    },
  };
}

function capitalQuestion(name: string, capital: string, stateCode: string): Question {
  return {
    id: `p_cap_${stateCode}`,
    topic: "government",
    question: {
      en: `What is the capital of ${name}?`,
      sq: `Cili është kryeqyteti i ${name}?`,
      ml: `${name}-ന്റെ തലസ്ഥാനം ഏതാണ്?`,
      gu: `${name}ની રાજધાની શું છે?`,
      vi: `Thủ phủ của ${name} là gì?`,
      tl: `Ano ang kabisera ng ${name}?`,
      es: `¿Cuál es la capital de ${name}?`,
      hmn: `Lub peev nroog ntawm ${name} yog dab tsi?`,
      ko: `${name}의 주도는 어디입니까?`,
      ru: `Какая столица штата ${name}?`,
      hi: `${name} की राजधानी क्या है?`,
      no: `Hva er hovedstaden i ${name}?`,
      fr: `Quelle est la capitale de ${name} ?`,
      uk: `Яка столиця штату ${name}?`,
      de: `Was ist die Hauptstadt von ${name}?`,
      pt: `Qual é a capital de ${name}?`,
      it: `Qual è la capitale di ${name}?`,
      zh: `${name} 州的首府是哪里？`,
      pl: `Jaka jest stolica stanu ${name}?`,
      el: `Ποια είναι η πρωτεύουσα της πολιτείας ${name};`,
    },
    options: buildCapitalOptions(capital, stateCode),
    correctIndex: 0,
    explanation: {
      en: `${capital} is the capital of ${name}.`,
      sq: `${capital} është kryeqyteti i ${name}.`,
      ml: `${capital} ആണ് ${name}-ന്റെ തലസ്ഥാനം.`,
      gu: `${capital} ${name}ની રાજધાની છે.`,
      vi: `${capital} là thủ phủ của ${name}.`,
      tl: `Ang ${capital} ay ang kabisera ng ${name}.`,
      es: `${capital} es la capital de ${name}.`,
      hmn: `${capital} yog lub peev nroog ntawm ${name}.`,
      ko: `${capital}이(가) ${name}의 주도입니다.`,
      ru: `${capital} - столица штата ${name}.`,
      hi: `${capital} ${name} की राजधानी है।`,
      no: `${capital} er hovedstaden i ${name}.`,
      fr: `${capital} est la capitale de ${name}.`,
      uk: `${capital} - столиця штату ${name}.`,
      de: `${capital} ist die Hauptstadt von ${name}.`,
      pt: `${capital} é a capital de ${name}.`,
      it: `${capital} è la capitale di ${name}.`,
      zh: `${capital} 是 ${name} 州的首府。`,
      pl: `${capital} jest stolicą stanu ${name}.`,
      el: `Η ${capital} είναι η πρωτεύουσα της πολιτείας ${name}.`,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════
//  Negative (D.C. / territory) question builders
//  Correct answer is a translated sentence; wrong answers are real names/cities.
// ════════════════════════════════════════════════════════════════════════

// ── D.C.: no Governor ──
function noGovernorQuestion(name: string, stateCode: string): Question {
  const correct: BilingualText = {
    en: "D.C. does not have a Governor",
    sq: "D.C. nuk ka guvernator",
    ml: "ഡി.സി.യിൽ ഗവർണർ ഇല്ല",
    gu: "ડી.સી.માં ગવર્નર નથી",
    vi: "D.C. không có Thống đốc",
    tl: "Walang Gobernador ang D.C.",
    es: "D.C. no tiene Gobernador",
    hmn: "D.C. tsis muaj Tus Kav Xeev",
    ko: "D.C.에는 주지사가 없습니다",
    ru: "В округе Колумбия нет губернатора",
    hi: "डी.सी. में कोई गवर्नर नहीं है",
    no: "D.C. har ingen guvernør",
    fr: "D.C. n'a pas de gouverneur",
    uk: "Округ Колумбія не має губернатора",
    de: "D.C. hat keinen Gouverneur",
    pt: "D.C. não tem governador",
    it: "D.C. non ha un governatore",
    zh: "华盛顿特区没有州长",
    pl: "D.C. nie ma gubernatora",
    el: "Η D.C. δεν έχει Κυβερνήτη",
  };
  return {
    id: `p_gov_${stateCode}`,
    topic: "government",
    is6520: true,
    question: {
      en: `Who is the Governor of ${name}?`,
      sq: `Kush është guvernatori i ${name}?`,
      ml: `${name}-ന്റെ ഗവർണർ ആരാണ്?`,
      gu: `${name}ના ગવર્નર કોણ છે?`,
      vi: `Thống đốc của ${name} là ai?`,
      tl: `Sino ang Gobernador ng ${name}?`,
      es: `¿Quién es el Gobernador de ${name}?`,
      hmn: `Leej twg yog Tus Kav Xeev ntawm ${name}?`,
      ko: `${name}의 주지사는 누구입니까?`,
      ru: `Кто губернатор штата ${name}?`,
      hi: `${name} के गवर्नर कौन हैं?`,
      no: `Hvem er guvernøren i ${name}?`,
      fr: `Qui est le gouverneur de ${name} ?`,
      uk: `Хто є губернатором штату ${name}?`,
      de: `Wer ist der Gouverneur von ${name}?`,
      pt: `Quem é o governador de ${name}?`,
      it: `Chi è il governatore di ${name}?`,
      zh: `${name} 的州长是谁？`,
      pl: `Kto jest gubernatorem ${name}?`,
      el: `Ποιος είναι ο Κυβερνήτης της ${name};`,
    },
    options: [correct, ...pickWrongAnswers("__none__", otherGovernors, 3)],
    correctIndex: 0,
    explanation: {
      en: "Washington, D.C. is not a state, so it does not have a Governor.",
      sq: "Uashingtoni, D.C. nuk është shtet, prandaj nuk ka guvernator.",
      ml: "വാഷിംഗ്ടൺ ഡി.സി. ഒരു സംസ്ഥാനമല്ല, അതിനാൽ അതിന് ഗവർണർ ഇല്ല.",
      gu: "વૉશિંગ્ટન, ડી.સી. રાજ્ય નથી, તેથી તેમાં ગવર્નર નથી.",
      vi: "Washington, D.C. không phải là tiểu bang, nên không có Thống đốc.",
      tl: "Ang Washington, D.C. ay hindi isang estado, kaya wala itong Gobernador.",
      es: "Washington, D.C. no es un estado, por lo que no tiene Gobernador.",
      hmn: "Washington, D.C. tsis yog ib lub xeev, yog li nws tsis muaj Tus Kav Xeev.",
      ko: "워싱턴 D.C.는 주가 아니므로 주지사가 없습니다.",
      ru: "Вашингтон (округ Колумбия) не является штатом, поэтому у него нет губернатора.",
      hi: "वॉशिंगटन, डी.सी. एक राज्य नहीं है, इसलिए इसमें कोई गवर्नर नहीं है।",
      no: "Washington, D.C. er ikke en delstat, så den har ingen guvernør.",
      fr: "Washington, D.C. n'est pas un État, donc il n'a pas de gouverneur.",
      uk: "Вашингтон, округ Колумбія, не є штатом, тому не має губернатора.",
      de: "Washington, D.C. ist kein Bundesstaat und hat daher keinen Gouverneur.",
      pt: "Washington, D.C. não é um estado, portanto não tem governador.",
      it: "Washington, D.C. non è uno stato, quindi non ha un governatore.",
      zh: "华盛顿特区不是一个州，因此没有州长。",
      pl: "Waszyngton D.C. nie jest stanem, więc nie ma gubernatora.",
      el: "Η Ουάσιγκτον D.C. δεν είναι πολιτεία, επομένως δεν έχει Κυβερνήτη.",
    },
  };
}

// ── D.C. + territories: no U.S. Senators ──
function noSenatorQuestion(state: StateData, stateCode: string): Question {
  const name = state.name;
  const isDC = state.kind === "district";
  const correct: BilingualText = isDC
    ? {
        en: "D.C. does not have U.S. Senators",
        sq: "D.C. nuk ka senatorë amerikanë",
        ml: "ഡി.സി.യിൽ യു.എസ്. സെനറ്റർമാർ ഇല്ല",
        gu: "ડી.સી.માં યુ.એસ. સેનેટર નથી",
        vi: "D.C. không có Thượng nghị sĩ Hoa Kỳ",
        tl: "Walang U.S. Senator ang D.C.",
        es: "D.C. no tiene Senadores de EE. UU.",
        hmn: "D.C. tsis muaj U.S. Senators",
        ko: "D.C.에는 미국 상원의원이 없습니다",
        ru: "В округе Колумбия нет сенаторов США",
        hi: "डी.सी. में यू.एस. सीनेटर नहीं हैं",
        no: "D.C. har ingen amerikanske senatorer",
        fr: "D.C. n'a pas de sénateurs américains",
        uk: "Округ Колумбія не має сенаторів США",
        de: "D.C. hat keine US-Senatoren",
        pt: "D.C. não tem senadores dos EUA",
        it: "D.C. non ha senatori degli Stati Uniti",
        zh: "华盛顿特区没有联邦参议员",
        pl: "D.C. nie ma senatorów USA",
        el: "Η D.C. δεν έχει Γερουσιαστές των ΗΠΑ",
      }
    : {
        en: `${name} has no U.S. Senators`,
        sq: `${name} nuk ka senatorë amerikanë`,
        ml: `${name}-ൽ യു.എസ്. സെനറ്റർമാർ ഇല്ല`,
        gu: `${name}માં યુ.એસ. સેનેટર નથી`,
        vi: `${name} không có Thượng nghị sĩ Hoa Kỳ`,
        tl: `Walang U.S. Senator ang ${name}`,
        es: `${name} no tiene Senadores de EE. UU.`,
        hmn: `${name} tsis muaj U.S. Senators`,
        ko: `${name}에는 미국 상원의원이 없습니다`,
        ru: `${name} не имеет сенаторов США`,
        hi: `${name} में यू.एस. सीनेटर नहीं हैं`,
        no: `${name} har ingen amerikanske senatorer`,
        fr: `${name} n'a pas de sénateurs américains`,
        uk: `${name} не має сенаторів США`,
        de: `${name} hat keine US-Senatoren`,
        pt: `${name} não tem senadores dos EUA`,
        it: `${name} non ha senatori degli Stati Uniti`,
        zh: `${name} 没有联邦参议员`,
        pl: `${name} nie ma senatorów USA`,
        el: `Η ${name} δεν έχει Γερουσιαστές των ΗΠΑ`,
      };
  const explanation: BilingualText = isDC
    ? {
        en: "Washington, D.C. is not a state, so it has no U.S. Senators.",
        sq: "Uashingtoni, D.C. nuk është shtet, prandaj nuk ka senatorë amerikanë.",
        ml: "വാഷിംഗ്ടൺ ഡി.സി. ഒരു സംസ്ഥാനമല്ല, അതിനാൽ അതിന് യു.എസ്. സെനറ്റർമാർ ഇല്ല.",
        gu: "વૉશિંગ્ટન, ડી.સી. રાજ્ય નથી, તેથી તેમાં યુ.એસ. સેનેટર નથી.",
        vi: "Washington, D.C. không phải là tiểu bang, nên không có Thượng nghị sĩ Hoa Kỳ.",
        tl: "Ang Washington, D.C. ay hindi isang estado, kaya wala itong U.S. Senator.",
        es: "Washington, D.C. no es un estado, por lo que no tiene Senadores de EE. UU.",
        hmn: "Washington, D.C. tsis yog ib lub xeev, yog li nws tsis muaj U.S. Senators.",
        ko: "워싱턴 D.C.는 주가 아니므로 미국 상원의원이 없습니다.",
        ru: "Вашингтон (округ Колумбия) не является штатом, поэтому у него нет сенаторов США.",
        hi: "वॉशिंगटन, डी.सी. एक राज्य नहीं है, इसलिए इसमें यू.एस. सीनेटर नहीं हैं।",
        no: "Washington, D.C. er ikke en delstat, så den har ingen amerikanske senatorer.",
        fr: "Washington, D.C. n'est pas un État, donc il n'a pas de sénateurs américains.",
        uk: "Вашингтон, округ Колумбія, не є штатом, тому не має сенаторів США.",
        de: "Washington, D.C. ist kein Bundesstaat und hat daher keine US-Senatoren.",
        pt: "Washington, D.C. não é um estado, portanto não tem senadores dos EUA.",
        it: "Washington, D.C. non è uno stato, quindi non ha senatori degli Stati Uniti.",
        zh: "华盛顿特区不是一个州，因此没有联邦参议员。",
        pl: "Waszyngton D.C. nie jest stanem, więc nie ma senatorów USA.",
        el: "Η Ουάσιγκτον D.C. δεν είναι πολιτεία, επομένως δεν έχει Γερουσιαστές των ΗΠΑ.",
      }
    : {
        en: `${name} is a U.S. territory, not a state, so it has no U.S. Senators.`,
        sq: `${name} është territor amerikan, jo shtet, prandaj nuk ka senatorë amerikanë.`,
        ml: `${name} ഒരു യു.എസ്. പ്രദേശമാണ്, സംസ്ഥാനമല്ല, അതിനാൽ അതിന് യു.എസ്. സെനറ്റർമാർ ഇല്ല.`,
        gu: `${name} એક યુ.એસ. પ્રદેશ છે, રાજ્ય નથી, તેથી તેમાં યુ.એસ. સેનેટર નથી.`,
        vi: `${name} là một lãnh thổ Hoa Kỳ, không phải tiểu bang, nên không có Thượng nghị sĩ Hoa Kỳ.`,
        tl: `Ang ${name} ay isang teritoryo ng U.S., hindi isang estado, kaya wala itong U.S. Senator.`,
        es: `${name} es un territorio de EE. UU., no un estado, por lo que no tiene Senadores de EE. UU.`,
        hmn: `${name} yog ib cheeb tsam ntawm Asmeskas, tsis yog ib lub xeev, yog li nws tsis muaj U.S. Senators.`,
        ko: `${name}은(는) 주가 아니라 미국 영토이므로 미국 상원의원이 없습니다.`,
        ru: `${name} - это территория США, а не штат, поэтому там нет сенаторов США.`,
        hi: `${name} एक यू.एस. क्षेत्र है, राज्य नहीं, इसलिए इसमें यू.एस. सीनेटर नहीं हैं।`,
        no: `${name} er et amerikansk territorium, ikke en delstat, så det har ingen amerikanske senatorer.`,
        fr: `${name} est un territoire américain, pas un État, donc il n'a pas de sénateurs américains.`,
        uk: `${name} є територією США, а не штатом, тому не має сенаторів США.`,
        de: `${name} ist ein US-Territorium, kein Bundesstaat, und hat daher keine US-Senatoren.`,
        pt: `${name} é um território dos EUA, não um estado, portanto não tem senadores dos EUA.`,
        it: `${name} è un territorio degli Stati Uniti, non uno stato, quindi non ha senatori degli Stati Uniti.`,
        zh: `${name} 是美国的领地而非州，因此没有联邦参议员。`,
        pl: `${name} jest terytorium USA, a nie stanem, więc nie ma senatorów USA.`,
        el: `Η ${name} είναι έδαφος των ΗΠΑ και όχι πολιτεία, επομένως δεν έχει Γερουσιαστές των ΗΠΑ.`,
      };
  return {
    id: `p_sen_${stateCode}`,
    topic: "government",
    question: {
      en: `Who is one of your state's U.S. Senators? (${name})`,
      sq: `Kush është një nga senatorët amerikanë të shtetit tuaj? (${name})`,
      ml: `നിങ്ങളുടെ സംസ്ഥാനത്തെ യു.എസ്. സെനറ്റർമാരിൽ ഒരാൾ ആരാണ്? (${name})`,
      gu: `તમારા રાજ્યના યુ.એસ. સેનેટરોમાંથી એક કોણ છે? (${name})`,
      vi: `Ai là một trong các Thượng nghị sĩ Hoa Kỳ của tiểu bang bạn? (${name})`,
      tl: `Sino ang isa sa mga U.S. Senator ng iyong estado? (${name})`,
      es: `¿Quién es uno de los Senadores de EE. UU. de su estado? (${name})`,
      hmn: `Leej twg yog ib tug ntawm koj lub xeev cov Senator Meskas? (${name})`,
      ko: `당신의 주의 미국 상원의원 중 한 명은 누구입니까? (${name})`,
      ru: `Кто один из сенаторов США от вашего штата? (${name})`,
      hi: `आपके राज्य के अमेरिकी सीनेटरों में से एक कौन हैं? (${name})`,
      no: `Hvem er en av delstatens amerikanske senatorer? (${name})`,
      fr: `Qui est l'un des sénateurs américains de votre État ? (${name})`,
      uk: `Назвіть одного із сенаторів США від вашого штату? (${name})`,
      de: `Wer ist einer der US-Senatoren Ihres Bundesstaates? (${name})`,
      pt: `Quem é um dos senadores dos EUA pelo seu estado? (${name})`,
      it: `Chi è uno dei senatori degli Stati Uniti del tuo stato? (${name})`,
      zh: `您所在州的一位联邦参议员是谁？（${name}）`,
      pl: `Kto jest jednym z senatorów USA z Pana/Pani stanu? (${name})`,
      el: `Ποιος είναι ένας από τους Γερουσιαστές των ΗΠΑ της πολιτείας σας; (${name})`,
    },
    options: [correct, ...pickWrongAnswers("__none__", otherSenators, 3)],
    correctIndex: 0,
    explanation,
  };
}

// ── D.C. + territories: no voting U.S. Representative ──
function noRepQuestion(state: StateData, stateCode: string): Question {
  const name = state.name;
  const isDC = state.kind === "district";
  const correct: BilingualText = isDC
    ? {
        en: "D.C. has no voting U.S. Representative",
        sq: "D.C. nuk ka përfaqësues amerikan me të drejtë vote",
        ml: "ഡി.സി.യിൽ വോട്ടവകാശമുള്ള യു.എസ്. പ്രതിനിധി ഇല്ല",
        gu: "ડી.સી.માં મતદાન અધિકારવાળા યુ.એસ. પ્રતિનિધિ નથી",
        vi: "D.C. không có Dân biểu Hoa Kỳ có quyền biểu quyết",
        tl: "Walang bumobotong U.S. Representative ang D.C.",
        es: "D.C. no tiene Representante ante el Congreso de EE. UU. con derecho a voto",
        hmn: "D.C. tsis muaj Tus Sawv Cev Meskas uas muaj cai pov npav",
        ko: "D.C.에는 투표권을 가진 미국 하원의원이 없습니다",
        ru: "В округе Колумбия нет представителя США с правом голоса",
        hi: "डी.सी. में मतदान अधिकार वाला यू.एस. प्रतिनिधि नहीं है",
        no: "D.C. har ingen stemmeberettiget representant i Kongressen",
        fr: "D.C. n'a pas de représentant américain avec droit de vote",
        uk: "Округ Колумбія не має представника США з правом голосу",
        de: "D.C. hat keinen stimmberechtigten US-Abgeordneten",
        pt: "D.C. não tem representante com direito a voto",
        it: "D.C. non ha un rappresentante con diritto di voto",
        zh: "华盛顿特区没有拥有表决权的联邦众议员",
        pl: "D.C. nie ma przedstawiciela z prawem głosu",
        el: "Η D.C. δεν έχει εκπρόσωπο με δικαίωμα ψήφου",
      }
    : {
        en: `${name} has no voting U.S. Representative`,
        sq: `${name} nuk ka përfaqësues amerikan me të drejtë vote`,
        ml: `${name}-ൽ വോട്ടവകാശമുള്ള യു.എസ്. പ്രതിനിധി ഇല്ല`,
        gu: `${name}માં મતદાન અધિકારવાળા યુ.એસ. પ્રતિનિધિ નથી`,
        vi: `${name} không có Dân biểu Hoa Kỳ có quyền biểu quyết`,
        tl: `Walang bumobotong U.S. Representative ang ${name}`,
        es: `${name} no tiene Representante ante el Congreso de EE. UU. con derecho a voto`,
        hmn: `${name} tsis muaj Tus Sawv Cev Meskas uas muaj cai pov npav`,
        ko: `${name}에는 투표권을 가진 미국 하원의원이 없습니다`,
        ru: `${name} не имеет представителя США с правом голоса`,
        hi: `${name} में मतदान अधिकार वाला यू.एस. प्रतिनिधि नहीं है`,
        no: `${name} har ingen stemmeberettiget representant i Kongressen`,
        fr: `${name} n'a pas de représentant américain avec droit de vote`,
        uk: `${name} не має представника США з правом голосу`,
        de: `${name} hat keinen stimmberechtigten US-Abgeordneten`,
        pt: `${name} não tem representante com direito a voto`,
        it: `${name} non ha un rappresentante con diritto di voto`,
        zh: `${name} 没有拥有表决权的联邦众议员`,
        pl: `${name} nie ma przedstawiciela z prawem głosu`,
        el: `Η ${name} δεν έχει εκπρόσωπο με δικαίωμα ψήφου`,
      };
  const explanation: BilingualText = isDC
    ? {
        en: "Washington, D.C. has no voting U.S. Representative; it is represented by a non-voting Delegate in the House.",
        sq: "Uashingtoni, D.C. nuk ka përfaqësues amerikan me të drejtë vote; përfaqësohet nga një delegat pa të drejtë vote në Dhomë.",
        ml: "വാഷിംഗ്ടൺ ഡി.സി.യിൽ വോട്ടവകാശമുള്ള യു.എസ്. പ്രതിനിധി ഇല്ല; ജനപ്രതിനിധി സഭയിൽ വോട്ടവകാശമില്ലാത്ത ഒരു ഡെലിഗേറ്റാണ് അതിനെ പ്രതിനിധീകരിക്കുന്നത്.",
        gu: "વૉશિંગ્ટન, ડી.સી.માં મતદાન અધિકારવાળા યુ.એસ. પ્રતિનિધિ નથી; હાઉસમાં મતદાન અધિકાર વિનાના ડેલિગેટ તેનું પ્રતિનિધિત્વ કરે છે.",
        vi: "Washington, D.C. không có Dân biểu Hoa Kỳ có quyền biểu quyết; nó được đại diện bởi một Đại biểu không có quyền biểu quyết tại Hạ viện.",
        tl: "Ang Washington, D.C. ay walang bumobotong U.S. Representative; kinakatawan ito ng isang di-bumobotong Delegate sa Kapulungan.",
        es: "Washington, D.C. no tiene Representante con derecho a voto; está representado por un Delegado sin voto en la Cámara.",
        hmn: "Washington, D.C. tsis muaj Tus Sawv Cev Meskas uas muaj cai pov npav; muaj ib tug Delegate uas tsis muaj cai pov npav sawv cev rau nws hauv Tsev Neeg Sawv Cev.",
        ko: "워싱턴 D.C.에는 투표권을 가진 미국 하원의원이 없으며, 하원에서 투표권이 없는 대의원(Delegate)이 대표합니다.",
        ru: "У Вашингтона (округ Колумбия) нет представителя США с правом голоса; в Палате представителей его представляет делегат без права голоса.",
        hi: "वॉशिंगटन, डी.सी. में मतदान अधिकार वाला यू.एस. प्रतिनिधि नहीं है; सदन में एक गैर-मतदान प्रतिनिधि (डेलिगेट) इसका प्रतिनिधित्व करता है।",
        no: "Washington, D.C. har ingen stemmeberettiget representant i Kongressen; den representeres av en delegat uten stemmerett i Representantenes hus.",
        fr: "Washington, D.C. n'a pas de représentant américain avec droit de vote ; il est représenté par un délégué sans droit de vote à la Chambre.",
        uk: "Вашингтон, округ Колумбія, не має представника США з правом голосу; у Палаті представників його представляє делегат без права голосу.",
        de: "Washington, D.C. hat keinen stimmberechtigten US-Abgeordneten; es wird durch einen Delegierten ohne Stimmrecht im Repräsentantenhaus vertreten.",
        pt: "Washington, D.C. não tem representante com direito a voto; é representado por um delegado sem direito a voto na Câmara.",
        it: "Washington, D.C. non ha un rappresentante con diritto di voto; è rappresentato da un delegato senza diritto di voto alla Camera.",
        zh: "华盛顿特区没有拥有表决权的联邦众议员；它由一名在众议院没有表决权的代表代表。",
        pl: "Waszyngton D.C. nie ma przedstawiciela z prawem głosu; reprezentuje go delegat bez prawa głosu w Izbie Reprezentantów.",
        el: "Η Ουάσιγκτον D.C. δεν έχει εκπρόσωπο με δικαίωμα ψήφου· εκπροσωπείται από αντιπρόσωπο χωρίς δικαίωμα ψήφου στη Βουλή.",
      }
    : {
        en: `${name} is a U.S. territory, so it has no voting U.S. Representative in Congress.`,
        sq: `${name} është territor amerikan, prandaj nuk ka përfaqësues amerikan me të drejtë vote në Kongres.`,
        ml: `${name} ഒരു യു.എസ്. പ്രദേശമാണ്, അതിനാൽ കോൺഗ്രസിൽ വോട്ടവകാശമുള്ള യു.എസ്. പ്രതിനിധി ഇല്ല.`,
        gu: `${name} એક યુ.એસ. પ્રદેશ છે, તેથી કૉંગ્રેસમાં તેનો મતદાન અધિકારવાળો યુ.એસ. પ્રતિનિધિ નથી.`,
        vi: `${name} là một lãnh thổ Hoa Kỳ, nên không có Dân biểu Hoa Kỳ có quyền biểu quyết trong Quốc hội.`,
        tl: `Ang ${name} ay isang teritoryo ng U.S., kaya wala itong bumobotong U.S. Representative sa Kongreso.`,
        es: `${name} es un territorio de EE. UU., por lo que no tiene Representante con derecho a voto en el Congreso.`,
        hmn: `${name} yog ib cheeb tsam ntawm Asmeskas, yog li nws tsis muaj Tus Sawv Cev Meskas uas muaj cai pov npav hauv Congress.`,
        ko: `${name}은(는) 미국 영토이므로 의회에 투표권을 가진 미국 하원의원이 없습니다.`,
        ru: `${name} - это территория США, поэтому в Конгрессе нет её представителя с правом голоса.`,
        hi: `${name} एक यू.एस. क्षेत्र है, इसलिए कांग्रेस में इसका मतदान अधिकार वाला यू.एस. प्रतिनिधि नहीं है।`,
        no: `${name} er et amerikansk territorium, så det har ingen stemmeberettiget representant i Kongressen.`,
        fr: `${name} est un territoire américain, donc il n'a pas de représentant américain avec droit de vote au Congrès.`,
        uk: `${name} є територією США, тому не має представника в Конгресі з правом голосу.`,
        de: `${name} ist ein US-Territorium und hat daher keinen stimmberechtigten US-Abgeordneten im Kongress.`,
        pt: `${name} é um território dos EUA, portanto não tem representante com direito a voto no Congresso.`,
        it: `${name} è un territorio degli Stati Uniti, quindi non ha un rappresentante con diritto di voto al Congresso.`,
        zh: `${name} 是美国的领地，因此在国会中没有拥有表决权的联邦众议员。`,
        pl: `${name} jest terytorium USA, więc nie ma przedstawiciela z prawem głosu w Kongresie.`,
        el: `Η ${name} είναι έδαφος των ΗΠΑ, επομένως δεν έχει εκπρόσωπο με δικαίωμα ψήφου στο Κογκρέσο.`,
      };
  return {
    id: `p_rep_${stateCode}`,
    topic: "government",
    question: {
      en: `Who is your U.S. Representative? (${name})`,
      sq: `Kush është përfaqësuesi juaj amerikan? (${name})`,
      ml: `നിങ്ങളുടെ യു.എസ്. പ്രതിനിധി ആരാണ്? (${name})`,
      gu: `તમારા યુ.એસ. પ્રતિનિધિ કોણ છે? (${name})`,
      vi: `Dân biểu Hoa Kỳ của bạn là ai? (${name})`,
      tl: `Sino ang iyong U.S. Representative? (${name})`,
      es: `¿Quién es su Representante ante el Congreso de EE. UU.? (${name})`,
      hmn: `Leej twg yog koj Tus Sawv Cev Meskas? (${name})`,
      ko: `당신의 미국 하원의원은 누구입니까? (${name})`,
      ru: `Кто ваш представитель в Конгрессе США? (${name})`,
      hi: `अमेरिकी कांग्रेस में आपके प्रतिनिधि कौन हैं? (${name})`,
      no: `Hvem er din representant i Kongressen? (${name})`,
      fr: `Qui est votre représentant américain ? (${name})`,
      uk: `Хто є вашим представником у Палаті представників США? (${name})`,
      de: `Wer ist Ihr US-Abgeordneter? (${name})`,
      pt: `Quem é o seu representante nos EUA? (${name})`,
      it: `Chi è il tuo rappresentante negli Stati Uniti? (${name})`,
      zh: `您的联邦众议员是谁？（${name}）`,
      pl: `Kto jest Pana/Pani przedstawicielem w Kongresie USA? (${name})`,
      el: `Ποιος είναι ο εκπρόσωπός σας στη Βουλή των ΗΠΑ; (${name})`,
    },
    options: [correct, ...pickWrongAnswers("__none__", otherReps, 3)],
    correctIndex: 0,
    explanation,
  };
}

// ── D.C.: no state capital ──
function noCapitalQuestion(name: string, stateCode: string): Question {
  const correct: BilingualText = {
    en: "D.C. is not a state and does not have a capital",
    sq: "D.C. nuk është shtet dhe nuk ka kryeqytet",
    ml: "ഡി.സി. ഒരു സംസ്ഥാനമല്ല, തലസ്ഥാനവുമില്ല",
    gu: "ડી.સી. રાજ્ય નથી અને તેની રાજધાની નથી",
    vi: "D.C. không phải là tiểu bang và không có thủ phủ",
    tl: "Ang D.C. ay hindi isang estado at walang kabisera",
    es: "D.C. no es un estado y no tiene capital",
    hmn: "D.C. tsis yog ib lub xeev thiab tsis muaj lub peev nroog",
    ko: "D.C.는 주가 아니며 주도가 없습니다",
    ru: "Округ Колумбия не является штатом и не имеет столицы",
    hi: "डी.सी. एक राज्य नहीं है और इसकी कोई राजधानी नहीं है",
    no: "D.C. er ikke en delstat og har ingen hovedstad",
    fr: "D.C. n'est pas un État et n'a pas de capitale",
    uk: "Округ Колумбія не є штатом і не має столиці штату",
    de: "D.C. ist kein Bundesstaat und hat keine Hauptstadt",
    pt: "D.C. não é um estado e não tem capital",
    it: "D.C. non è uno stato e non ha una capitale",
    zh: "华盛顿特区不是一个州，没有州首府",
    pl: "D.C. nie jest stanem i nie ma stolicy stanowej",
    el: "Η D.C. δεν είναι πολιτεία και δεν έχει πρωτεύουσα",
  };
  return {
    id: `p_cap_${stateCode}`,
    topic: "government",
    question: {
      en: `What is the capital of ${name}?`,
      sq: `Cili është kryeqyteti i ${name}?`,
      ml: `${name}-ന്റെ തലസ്ഥാനം ഏതാണ്?`,
      gu: `${name}ની રાજધાની શું છે?`,
      vi: `Thủ phủ của ${name} là gì?`,
      tl: `Ano ang kabisera ng ${name}?`,
      es: `¿Cuál es la capital de ${name}?`,
      hmn: `Lub peev nroog ntawm ${name} yog dab tsi?`,
      ko: `${name}의 주도는 어디입니까?`,
      ru: `Какая столица штата ${name}?`,
      hi: `${name} की राजधानी क्या है?`,
      no: `Hva er hovedstaden i ${name}?`,
      fr: `Quelle est la capitale de ${name} ?`,
      uk: `Яка столиця штату ${name}?`,
      de: `Was ist die Hauptstadt von ${name}?`,
      pt: `Qual é a capital de ${name}?`,
      it: `Qual è la capitale di ${name}?`,
      zh: `${name} 的首府是哪里？`,
      pl: `Jaka jest stolica ${name}?`,
      el: `Ποια είναι η πρωτεύουσα της ${name};`,
    },
    options: [correct, ...pickWrongAnswers("__none__", otherCapitals.default, 3)],
    correctIndex: 0,
    explanation: {
      en: "Washington, D.C. is a federal district, not a state, so it does not have a state capital.",
      sq: "Uashingtoni, D.C. është një distrikt federal, jo shtet, prandaj nuk ka kryeqytet shteti.",
      ml: "വാഷിംഗ്ടൺ ഡി.സി. ഒരു ഫെഡറൽ ജില്ലയാണ്, സംസ്ഥാനമല്ല, അതിനാൽ അതിന് സംസ്ഥാന തലസ്ഥാനമില്ല.",
      gu: "વૉશિંગ્ટન, ડી.સી. એક ફેડરલ ડિસ્ટ્રિક્ટ છે, રાજ્ય નથી, તેથી તેની કોઈ રાજ્ય રાજધાની નથી.",
      vi: "Washington, D.C. là một đặc khu liên bang, không phải tiểu bang, nên không có thủ phủ tiểu bang.",
      tl: "Ang Washington, D.C. ay isang pederal na distrito, hindi isang estado, kaya wala itong kabisera ng estado.",
      es: "Washington, D.C. es un distrito federal, no un estado, por lo que no tiene capital estatal.",
      hmn: "Washington, D.C. yog ib cheeb tsam federal, tsis yog ib lub xeev, yog li nws tsis muaj lub peev nroog xeev.",
      ko: "워싱턴 D.C.는 주가 아니라 연방 특별구이므로 주도가 없습니다.",
      ru: "Вашингтон (округ Колумбия) - это федеральный округ, а не штат, поэтому у него нет столицы штата.",
      hi: "वॉशिंगटन, डी.सी. एक संघीय जिला है, राज्य नहीं, इसलिए इसकी कोई राज्य राजधानी नहीं है।",
      no: "Washington, D.C. er et føderalt distrikt, ikke en delstat, så den har ingen delstatshovedstad.",
      fr: "Washington, D.C. est un district fédéral, pas un État, donc il n'a pas de capitale d'État.",
      uk: "Вашингтон, округ Колумбія, є федеральним округом, а не штатом, тому не має столиці штату.",
      de: "Washington, D.C. ist ein Bundesdistrikt, kein Bundesstaat, und hat daher keine Landeshauptstadt.",
      pt: "Washington, D.C. é um distrito federal, não um estado, portanto não tem capital estadual.",
      it: "Washington, D.C. è un distretto federale, non uno stato, quindi non ha una capitale di stato.",
      zh: "华盛顿特区是联邦特区而非州，因此没有州首府。",
      pl: "Waszyngton D.C. jest dystryktem federalnym, a nie stanem, więc nie ma stolicy stanowej.",
      el: "Η Ουάσιγκτον D.C. είναι ομοσπονδιακή περιφέρεια και όχι πολιτεία, επομένως δεν έχει πρωτεύουσα πολιτείας.",
    },
  };
}

/**
 * Localized district labels injected into Rep question/explanation strings
 * so non-English speakers don't see English "District 5" inside translated text.
 * District 0 is the convention for states with a single "At-Large" seat.
 */
function districtLabels(district: number): Record<Lang, string> {
  if (district === 0) {
    return {
      en: "At-Large",
      sq: "Në nivel shteti (At-Large)",
      ml: "മുഴുവൻ സംസ്ഥാനം",
      gu: "સમગ્ર રાજ્ય",
      vi: "Toàn tiểu bang",
      tl: "At-Large",
      es: "General",
      hmn: "Tag Nrho",
      ko: "전체 주",
      ru: "По штату",
      hi: "पूरे राज्य से",
      no: "Hele delstaten",
      fr: "Tout l'État",
      uk: "Увесь штат",
      de: "Der gesamte Bundesstaat",
      pt: "Todo o estado",
      it: "L'intero stato",
      zh: "全州唯一选区",
      pl: "Okręg stanowy (At-Large)",
      el: "Ενιαία περιφέρεια (At-Large)",
      id: "Kursi Negara Bagian (At-Large)",
      ro: "La nivel de stat (At-Large)",
      sv: "Hela delstaten (At-Large)",
      da: "Hele delstaten (At-Large)",
      nl: "Hele staat (At-Large)",
      fi: "Koko osavaltio (At-Large)",
      sr: "Цела држава (At-Large)",
      bs: "Cijela država (At-Large)",
      hr: "Cijela savezna država (At-Large)",
      bg: "Цялата щатска територия (At-Large)",
      cs: "Celý stát (At-Large)",
      hu: "Az egész állam (At-Large)",
      sk: "Celý štát (At-Large)",
      sl: "Celotna zvezna država (At-Large)",
      ja: "州全体（At-Large）",
      th: "ทั้งรัฐ (At-Large)",
      km: "ទូទាំងរដ្ឋ (At-Large)",
      zht: "全州 (At-Large)",
      tr: "Eyalet Geneli (At-Large)",
      lt: "Visa valstija (At-Large)",
      lv: "Viss štats (At-Large)",
      et: "Kogu osariik (At-Large)",
      ptpt: "Todo o estado (At-Large)",
      ca: "Tot l'estat (At-Large)",
      ta: "முழு மாநிலமும் (At-Large)",
      ht: "Tout eta a (At-Large)",
      ar: "الولاية بأكملها (At-Large)",
      he: "כל המדינה (At-Large)",
    };
  }
  return {
    en: `District ${district}`,
    sq: `Distrikti ${district}`,
    ml: `${district}-ാം ജില്ല`,
    gu: `ડિસ્ટ્રિક્ટ ${district}`,
    vi: `Khu vực ${district}`,
    tl: `Distrito ${district}`,
    es: `Distrito ${district}`,
    hmn: `Cheeb Tsam ${district}`,
    ko: `${district}선거구`,
    ru: `Округ ${district}`,
    hi: `जिला ${district}`,
    no: `Distrikt ${district}`,
    fr: `Circonscription ${district}`,
    uk: `Округ ${district}`,
    de: `Wahlbezirk ${district}`,
    pt: `Distrito ${district}`,
    it: `Distretto ${district}`,
    zh: `第 ${district} 选区`,
    pl: `Okręg ${district}`,
    el: `Περιφέρεια ${district}`,
    id: `Distrik ${district}`,
    ro: `Districtul ${district}`,
    sv: `Distrikt ${district}`,
    da: `Distrikt ${district}`,
    nl: `District ${district}`,
    fi: `Vaalipiiri ${district}`,
    sr: `Изборни округ ${district}`,
    bs: `Izborni okrug ${district}`,
    hr: `Izborni okrug ${district}`,
    bg: `Избирателен окръг ${district}`,
    cs: `Volební obvod ${district}`,
    hu: `${district}. választókerület`,
    sk: `Volebný obvod ${district}`,
    sl: `Volilni okraj ${district}`,
    ja: `第${district}選挙区`,
    th: `เขตเลือกตั้งที่ ${district}`,
    km: `មណ្ឌលទី ${district}`,
    zht: `第 ${district} 選區`,
    tr: `${district}. Bölge`,
    lt: `${district}-oji apygarda`,
    lv: `${district}. apgabals`,
    et: `${district}. ringkond`,
    ptpt: `${district}.º distrito`,
    ca: `Districte ${district}`,
    ta: `${district}-ஆவது தொகுதி`,
    ht: `Distri ${district}`,
    ar: `المنطقة ${district}`,
    he: `מחוז ${district}`,
  };
}

// ── Helper: build 4 options with correct answer at index 0 ──

/** Well-known governors from other states to use as wrong answers */
const otherGovernors = [
  "Gavin Newsom", "Ron DeSantis", "Greg Abbott", "Kathy Hochul",
  "Tim Walz", "Josh Green", "Wes Moore", "Jared Polis",
  "Sarah Huckabee Sanders", "Kay Ivey", "Phil Scott", "Janet Mills",
  "Brad Little", "Spencer Cox", "Jeff Landry", "Ned Lamont",
  "Maura Healey", "Kelly Ayotte", "Tina Kotek", "Bob Ferguson",
];

/** Well-known senators to use as wrong answers */
const otherSenators = [
  "Chuck Schumer", "Mitch McConnell", "Marco Rubio", "Bernie Sanders",
  "Elizabeth Warren", "Ted Cruz", "Amy Klobuchar", "Susan Collins",
  "John Cornyn", "Patty Murray", "Ron Wyden", "Alex Padilla",
  "Josh Hawley", "Kirsten Gillibrand", "Mazie Hirono", "Bill Cassidy",
];

/** Well-known representatives to use as wrong answers */
const otherReps = [
  "Nancy Pelosi", "Alexandria Ocasio-Cortez", "Kevin McCarthy",
  "Jim Jordan", "Hakeem Jeffries", "Adam Schiff", "Marjorie Taylor Greene",
  "Katie Porter", "Ilhan Omar", "Dan Crenshaw", "Pramila Jayapal",
  "Jamie Raskin", "Mike Johnson", "Steve Scalise", "Rosa DeLauro",
];

/** Well-known state capitals to use as wrong answers */
const otherCapitals: Record<string, string[]> = {
  TX: ["Houston", "Dallas", "San Antonio"],
  CA: ["Los Angeles", "San Francisco", "San Diego"],
  NY: ["New York City", "Buffalo", "Syracuse"],
  default: ["Springfield", "Columbus", "Richmond", "Trenton", "Harrisburg", "Lansing", "Madison", "Frankfort", "Nashville", "Raleigh", "Phoenix", "Tallahassee"],
};

/** Proper nouns don't translate - use the roman-script name across all languages. */
function nameOption(name: string): BilingualText {
  return { en: name, ml: name, gu: name, vi: name, tl: name, es: name, hmn: name, ko: name, ru: name, hi: name, no: name, fr: name, uk: name, de: name, pt: name, it: name, zh: name, pl: name, el: name, id: name, ro: name, sv: name, da: name, nl: name, fi: name, sr: name, bs: name, hr: name, bg: name, cs: name, hu: name, sk: name, sl: name, ja: name, th: name, km: name, zht: name, tr: name, lt: name, lv: name, et: name, ptpt: name, ca: name, ta: name, ht: name, ar: name, he: name, sq: name };
}

function pickWrongAnswers(correct: string, pool: string[], count: number): BilingualText[] {
  const filtered = pool.filter(
    (name) => name.toLowerCase() !== correct.toLowerCase()
  );
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(nameOption);
}

function buildGovernorOptions(correct: string): BilingualText[] {
  const wrongs = pickWrongAnswers(correct, otherGovernors, 3);
  return [nameOption(correct), ...wrongs];
}

function buildSenatorOptions(correct: string, otherStateSenator: string): BilingualText[] {
  // Exclude BOTH of this state's senators from the wrong-answers pool so
  // neither real senator ever appears as a fake "wrong" choice.
  const pool = otherSenators.filter(
    (s) => s.toLowerCase() !== otherStateSenator.toLowerCase()
  );
  const wrongs = pickWrongAnswers(correct, pool, 3);
  return [nameOption(correct), ...wrongs];
}

function buildRepOptions(correct: string): BilingualText[] {
  const wrongs = pickWrongAnswers(correct, otherReps, 3);
  return [nameOption(correct), ...wrongs];
}

function buildCapitalOptions(correct: string, stateCode: string): BilingualText[] {
  const pool = [
    ...(otherCapitals[stateCode] || []),
    ...otherCapitals.default,
  ];
  const wrongs = pickWrongAnswers(correct, pool, 3);
  return [nameOption(correct), ...wrongs];
}
