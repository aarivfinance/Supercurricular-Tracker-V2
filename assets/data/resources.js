/* Revision resources. level: gcse | alevel | both.  type: notes | papers | video | practice | flashcards | tests | reading
   Add your own from the page itself — these are the built-in starting set. */
window.RES_DATA = [
  // ---------- all subjects ----------
  { subj:"All subjects", t:"Physics & Maths Tutor", u:"https://www.physicsandmathstutor.com/", level:"both", type:"papers", d:"Past papers, mark schemes and topic-sorted questions for almost every subject, not just physics and maths." },
  { subj:"All subjects", t:"Save My Exams", u:"https://www.savemyexams.com/", level:"both", type:"notes", d:"Board-specific revision notes and topic questions. Some content is paywalled." },
  { subj:"All subjects", t:"Seneca Learning", u:"https://senecalearning.com/", level:"both", type:"practice", d:"Free spaced-repetition courses matched to each exam board." },
  { subj:"All subjects", t:"BBC Bitesize", u:"https://www.bbc.co.uk/bitesize", level:"gcse", type:"notes", d:"Solid first-pass notes and quick checks for GCSE." },
  { subj:"All subjects", t:"Khan Academy", u:"https://www.khanacademy.org/", level:"both", type:"video", d:"Free video lessons and practice, strongest for maths and economics." },
  { subj:"All subjects", t:"Wilson's School SharePoint", u:"https://wilsonsschools.sharepoint.com/", level:"both", type:"notes", d:"School revision resources across a broad range of subjects (school sign-in required)." },
  { subj:"All subjects", t:"Elmwood Education Digital Library", u:"https://library.elmwoodeducation.co.uk/books/", level:"both", type:"reading", d:"Elmwood Education’s digital book library (sign-in required)." },
  { subj:"All subjects", t:"Anki", u:"https://apps.ankiweb.net/", level:"both", type:"flashcards", d:"Spaced-repetition flashcards — the most efficient way to memorise quotes, dates and definitions." },
  { subj:"All subjects", t:"Quizlet", u:"https://quizlet.com/", level:"both", type:"flashcards", d:"Quick shared flashcard sets; easier than Anki, less powerful." },

  // ---------- exam boards ----------
  { subj:"Exam boards", t:"AQA", u:"https://www.aqa.org.uk/", level:"both", type:"papers", d:"Specifications, past papers and examiner reports." },
  { subj:"Exam boards", t:"Pearson Edexcel", u:"https://qualifications.pearson.com/", level:"both", type:"papers", d:"Specifications, past papers and examiner reports." },
  { subj:"Exam boards", t:"OCR", u:"https://www.ocr.org.uk/", level:"both", type:"papers", d:"Specifications, past papers and examiner reports." },
  { subj:"Exam boards", t:"WJEC Eduqas", u:"https://www.eduqas.co.uk/", level:"both", type:"papers", d:"Specifications, past papers and examiner reports." },

  // ---------- maths ----------
  { subj:"Maths", t:"Corbettmaths", u:"https://corbettmaths.com/", level:"gcse", type:"practice", d:"5-a-day, videos and worksheets for every GCSE topic." },
  { subj:"Maths", t:"Maths Genie", u:"https://www.mathsgenie.co.uk/", level:"both", type:"papers", d:"Past-paper questions sorted by topic and grade." },
  { subj:"Maths", t:"Dr Frost Maths", u:"https://www.drfrost.org/", level:"both", type:"practice", d:"Huge free question bank with auto-marking." },
  { subj:"Maths", t:"Integral Maths (MEI)", u:"https://integralmaths.org/", level:"alevel", type:"notes", d:"A-level and Further Maths resources used by many schools." },
  { subj:"Maths", t:"Westie's Workshop — Edexcel GCSE", u:"https://www.westiesworkshop.com/past-paper-questions/edexcel-gcse/", level:"gcse", type:"papers", d:"Edexcel GCSE Maths past-paper questions sorted by topic: algebra, number, shape & space, data/probability and proof." },
  { subj:"Maths", t:"Metatutor", u:"https://metatutor.co.uk/", level:"both", type:"notes", d:"Maths tuition from KS2 to A-level (paid one-to-one sessions)." },
  { subj:"Maths", t:"UKMT", u:"https://www.ukmt.org.uk/", level:"both", type:"practice", d:"Maths challenges and past problems — great preparation for TMUA-style thinking." },

  // ---------- sciences ----------
  { subj:"Sciences", t:"Cognito", u:"https://cognitoedu.org/", level:"gcse", type:"video", d:"Short videos and quizzes for GCSE biology, chemistry and physics." },
  { subj:"Sciences", t:"Freesciencelessons", u:"https://www.youtube.com/@Freesciencelessons", level:"gcse", type:"video", d:"Topic-by-topic GCSE science videos." },
  { subj:"Sciences", t:"Isaac Physics", u:"https://isaacphysics.org/", level:"both", type:"practice", d:"Cambridge-run problem solving for physics and maths." },
  { subj:"Sciences", t:"Chemrevise", u:"https://chemrevise.org/", level:"both", type:"notes", d:"Concise chemistry revision guides." },

  // ---------- economics ----------
  { subj:"Economics", t:"tutor2u Economics", u:"https://www.tutor2u.net/economics", level:"alevel", type:"notes", d:"Study notes, diagrams and exam technique." },
  { subj:"Economics", t:"EconplusDal", u:"https://www.youtube.com/@EconplusDal", level:"alevel", type:"video", d:"Clear A-level economics videos with exam-answer structure." },
  { subj:"Economics", t:"Economics Help", u:"https://www.economicshelp.org/", level:"alevel", type:"notes", d:"Plain-English explainers with real-world examples." },
  { subj:"Economics", t:"CORE Econ — The Economy", u:"https://www.core-econ.org/", level:"alevel", type:"reading", d:"Free university-level textbook; what Oxford sends PPE offer-holders." },

  // ---------- politics / philosophy / law ----------
  { subj:"Politics", t:"tutor2u Politics", u:"https://www.tutor2u.net/politics", level:"alevel", type:"notes", d:"UK and US politics notes and exam guidance." },
  { subj:"Politics", t:"UK Parliament", u:"https://www.parliament.uk/", level:"both", type:"reading", d:"Primary source for bills, committees and debates." },
  { subj:"Philosophy", t:"Stanford Encyclopedia of Philosophy", u:"https://plato.stanford.edu/", level:"alevel", type:"reading", d:"The authoritative free reference for any philosophical topic." },
  { subj:"Philosophy", t:"Philosophy Bites", u:"https://philosophybites.com/", level:"both", type:"video", d:"Short podcast interviews with leading philosophers." },

  // ---------- English ----------
  { subj:"English", t:"Mr Bruff", u:"https://www.youtube.com/@mrbruff", level:"gcse", type:"video", d:"GCSE English language and literature walkthroughs." },

  // ---------- admissions tests ----------
  { subj:"Admissions tests", t:"LNAT — official site & practice tests", u:"https://lnat.ac.uk/", level:"alevel", type:"tests", d:"Law National Aptitude Test. Official practice papers are free." },
  { subj:"Admissions tests", t:"Oxford admissions tests (TARA)", u:"https://www.ox.ac.uk/admissions/undergraduate/applying-to-oxford/guide/admissions-tests", level:"alevel", type:"tests", d:"Which test each Oxford course uses, with dates and preparation material." },
  { subj:"Admissions tests", t:"TMUA (via LSE)", u:"https://www.lse.ac.uk/study-at-lse/Undergraduate/Prospective-Students/How-to-Apply/Test-of-Mathematics-for-University-Admission-TMUA", level:"alevel", type:"tests", d:"Which courses need the TMUA, and links to preparation materials." },
];
