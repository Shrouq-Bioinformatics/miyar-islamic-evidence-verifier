export type RetrievedEvidence = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  reference: string;
  excerpt: string;
  url: string;
  edition: string;
  retrievedAt: string;
  score: number;
};

type EvidenceRecord = Omit<RetrievedEvidence, "retrievedAt" | "score"> & {
  aliases: string[];
};

const evidenceCorpus: EvidenceRecord[] = [
  {
    id: "quran-al-nahl-90",
    sourceId: "quran",
    sourceTitle: "القرآن الكريم — مصحف المدينة النبوية",
    sourceType: "نص قرآني",
    reference: "سورة النحل، الآية 90",
    excerpt:
      "إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالإِحْسَانِ وَإِيتَاءِ ذِي الْقُرْبَىٰ وَيَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ وَالْبَغْيِ ۚ يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُونَ",
    url: "https://quran.com/16/90",
    edition: "مصحف المدينة النبوية، رواية حفص عن عاصم",
    aliases: ["العدل", "الإحسان", "يأمر بالعدل", "النحل 90"],
  },
  {
    id: "bukhari-hadith-1",
    sourceId: "bukhari",
    sourceTitle: "صحيح البخاري",
    sourceType: "حديث",
    reference: "صحيح البخاري، كتاب بدء الوحي، حديث 1",
    excerpt:
      "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ، وَمَنْ كَانَتْ هِجْرَتُهُ لِدُنْيَا يُصِيبُهَا أَوْ امْرَأَةٍ يَنْكِحُهَا فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ",
    url: "https://sunnah.com/bukhari:1",
    edition: "ترقيم محمد فؤاد عبد الباقي، نسخة الويب المرئية",
    aliases: ["الأعمال بالنيات", "إنما الأعمال", "النيات", "البخاري 1"],
  },
  {
    id: "muslim-faith-55",
    sourceId: "muslim",
    sourceTitle: "صحيح مسلم",
    sourceType: "حديث",
    reference: "صحيح مسلم، كتاب الإيمان، حديث 55",
    excerpt:
      "الدِّينُ النَّصِيحَةُ. قُلْنَا: لِمَنْ؟ قَالَ: لِلَّهِ، وَلِكِتَابِهِ، وَلِرَسُولِهِ، وَلِأَئِمَّةِ الْمُسْلِمِينَ وَعَامَّتِهِمْ",
    url: "https://sunnah.com/muslim:55",
    edition: "ترقيم محمد فؤاد عبد الباقي، نسخة الويب المرئية",
    aliases: ["الدين النصيحة", "النصيحة", "مسلم 55"],
  },
];

function normalizeArabic(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalizeArabic(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}

export function retrieveEvidence(claim: string, retrievedAt = new Date().toISOString()): RetrievedEvidence[] {
  const claimText = normalizeArabic(claim);
  const claimTokens = new Set(tokens(claim));
  return evidenceCorpus
    .map((record) => {
      const aliasMatches = record.aliases.filter((alias) =>
        claimText.includes(normalizeArabic(alias)),
      ).length;
      const excerptTokens = new Set(tokens(record.excerpt));
      const tokenMatches = [...claimTokens].filter((token) => excerptTokens.has(token)).length;
      const score = Math.min(aliasMatches, 1) * 0.7 + Math.min(tokenMatches / 5, 1) * 0.3;
      return {
        ...record,
        retrievedAt,
        score: Number(score.toFixed(3)),
      };
    })
    .filter((record) => record.score >= 0.35)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ aliases: _aliases, ...record }) => record);
}

export function evidenceCatalog() {
  return evidenceCorpus.map(({ aliases: _aliases, ...record }) => record);
}