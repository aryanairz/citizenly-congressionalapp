/**
 * The 2025 USCIS civics test bank - 128 questions, applies to N-400s filed on
 * or after 2025-10-20 (see TEST_2025_CUTOFF in src/lib/interview-machine.ts).
 *
 * Ids and prompts mirror the Citizenly website's official question bank
 * (aryanairz/ourparents, data/questions.ts) exactly, so a mistake recorded
 * against one of these ids is valid on the shared backend and shows up in
 * Review Mistakes. Acceptable answers are expanded from the website's single
 * quiz answer to the full official USCIS answer sets, with extra spoken-form
 * variants (e.g. "World War 1" vs "World War I") because transcripts arrive
 * from speech recognition. The first acceptableAnswers entry is the display
 * form shown in feedback; later entries may be match-oriented variants.
 *
 * Officeholder answers verified 2026-08-23. Entries marked `dynamic` change
 * with elections/appointments and must be re-verified each cycle.
 */

import type { CivicsQuestion } from '@/lib/answer-matching';

export const CIVICS_2025: CivicsQuestion[] = [
  {
    id: 'g001',
    prompt: 'What is the supreme law of the land?',
    acceptableAnswers: ['The Constitution'],
  },
  {
    id: 'g002',
    prompt: 'What is the form of government of the United States?',
    acceptableAnswers: [
      'Republic',
      'Constitution-based federal republic',
      'Representative democracy',
    ],
  },
  {
    id: 'g003',
    prompt: 'How many amendments does the U.S. Constitution have?',
    acceptableAnswers: ['Twenty-seven (27)'],
  },
  {
    id: 'g004',
    prompt: 'What is the economic system of the United States?',
    acceptableAnswers: ['Capitalism', 'Free market economy', 'Market economy'],
  },
  {
    id: 'g005',
    prompt: 'Name the three branches of government.',
    acceptableAnswers: ['Legislative', 'Executive', 'Judicial'],
    requiredCount: 3,
  },
  {
    id: 'g006',
    prompt: 'How many U.S. senators are there?',
    acceptableAnswers: ['One hundred (100)'],
  },
  {
    id: 'g007',
    prompt: 'How long is a term for a U.S. senator?',
    acceptableAnswers: ['Six (6) years'],
  },
  {
    id: 'g008',
    prompt: 'How many voting members are in the House of Representatives?',
    acceptableAnswers: ['Four hundred thirty-five (435)'],
  },
  {
    id: 'g009',
    prompt: 'The President of the United States is elected for how many years?',
    acceptableAnswers: ['Four (4) years'],
  },
  {
    id: 'g010',
    prompt: 'What is the name of the President of the United States now?',
    acceptableAnswers: ['Donald Trump', 'Trump'],
    dynamic: true,
  },
  {
    id: 'g011',
    prompt: 'What is the name of the Vice President of the United States now?',
    acceptableAnswers: ['JD Vance', 'Vance'],
    dynamic: true,
  },
  {
    id: 'g012',
    prompt: 'What is the highest court in the United States?',
    acceptableAnswers: ['The Supreme Court'],
  },
  {
    id: 'g013',
    prompt: 'How many seats are on the Supreme Court?',
    acceptableAnswers: ['Nine (9)'],
  },
  {
    id: 'g014',
    prompt: 'Who is Commander in Chief of the U.S. military?',
    acceptableAnswers: ['The President'],
    negativeTokens: ['vice'],
  },
  {
    id: 'g015',
    prompt: 'If the president can no longer serve, who becomes president?',
    acceptableAnswers: ['The Vice President'],
  },
  {
    id: 'g016',
    prompt: 'Name one thing the U.S. Constitution does.',
    acceptableAnswers: [
      'Protects the rights of the people',
      'Protects rights',
      'Forms the government',
      'Sets up the government',
      'Defines powers of government',
    ],
  },
  {
    id: 'g017',
    prompt:
      'The U.S. Constitution starts with "We the People." What does "We the People" mean?',
    acceptableAnswers: [
      'Self-government',
      'Popular sovereignty',
      'Consent of the governed',
      'The people govern themselves',
      'Social contract',
    ],
  },
  {
    id: 'g018',
    prompt: 'How are changes made to the U.S. Constitution?',
    acceptableAnswers: ['Amendments', 'The amendment process'],
  },
  {
    id: 'g019',
    prompt: 'Why is the Declaration of Independence important?',
    acceptableAnswers: [
      'It says America is free from British control',
      'Free from Britain',
      'All people are created equal',
      'It identifies inherent rights',
      'It identifies individual freedoms',
      'It announced our independence',
    ],
  },
  {
    id: 'g020',
    prompt:
      'What founding document said the American colonies were free from Britain?',
    acceptableAnswers: ['The Declaration of Independence'],
  },
  {
    id: 'g021',
    prompt:
      'Name two important ideas from the Declaration of Independence and the U.S. Constitution.',
    acceptableAnswers: [
      'Equality',
      'Liberty',
      'Social contract',
      'Natural rights',
      'Limited government',
      'Self-government',
    ],
    requiredCount: 2,
  },
  {
    id: 'g022',
    prompt:
      'The words "Life, Liberty, and the pursuit of Happiness" are in what founding document?',
    acceptableAnswers: ['The Declaration of Independence'],
  },
  {
    id: 'g023',
    prompt: 'What is the rule of law?',
    acceptableAnswers: [
      'Everyone must follow the law',
      'No one is above the law',
      'Leaders must obey the law',
      'Government must obey the law',
    ],
  },
  {
    id: 'g024',
    prompt: 'Many documents influenced the U.S. Constitution. Name one.',
    acceptableAnswers: [
      'The Declaration of Independence',
      'The Articles of Confederation',
      'The Federalist Papers',
      'The Anti-Federalist Papers',
      'The Virginia Declaration of Rights',
      'The Fundamental Orders of Connecticut',
      'The Mayflower Compact',
      'The Iroquois Great Law of Peace',
    ],
  },
  {
    id: 'g025',
    prompt: 'There are three branches of government. Why?',
    acceptableAnswers: [
      'So one part does not become too powerful',
      'Checks and balances',
      'Separation of powers',
    ],
  },
  {
    id: 'g026',
    prompt:
      'The President of the United States is in charge of which branch of government?',
    acceptableAnswers: ['The executive branch', 'Executive'],
  },
  {
    id: 'g027',
    prompt: 'What part of the federal government writes laws?',
    acceptableAnswers: [
      'Congress',
      'The legislative branch',
      'The Senate and House of Representatives',
      'The U.S. legislature',
    ],
  },
  {
    id: 'g028',
    prompt: 'What are the two parts of the U.S. Congress?',
    acceptableAnswers: [
      'The Senate and House of Representatives',
      'The Senate and the House',
    ],
  },
  {
    id: 'g029',
    prompt: 'Name one power of the U.S. Congress.',
    acceptableAnswers: [
      'Writes laws',
      'Passes laws',
      'Makes laws',
      'Declares war',
      'Makes the federal budget',
    ],
  },
  {
    // State-dependent (website replaces this with a personalized question);
    // excluded from interview draws - see INTERVIEW_POOLS.
    id: 'g030',
    prompt: "Who is one of your state's U.S. senators now?",
    acceptableAnswers: ['Answers will vary by state'],
    dynamic: true,
  },
  {
    id: 'g031',
    prompt: 'How long is a term for a member of the House of Representatives?',
    acceptableAnswers: ['Two (2) years'],
  },
  {
    id: 'g032',
    prompt:
      'Why do U.S. representatives serve shorter terms than U.S. senators?',
    acceptableAnswers: [
      'To more closely follow public opinion',
      'They represent the people more directly',
      'To answer to the people more often',
    ],
  },
  {
    id: 'g033',
    prompt: 'How many senators does each state have?',
    acceptableAnswers: ['Two (2)'],
  },
  {
    id: 'g034',
    prompt: 'Why does each state have two senators?',
    acceptableAnswers: [
      'Equal representation for small states',
      'Equal representation',
      'The Great Compromise',
      'The Connecticut Compromise',
    ],
  },
  {
    // State-dependent; excluded from interview draws - see INTERVIEW_POOLS.
    id: 'g035',
    prompt: 'Name your U.S. representative.',
    acceptableAnswers: ['Answers will vary by district'],
    dynamic: true,
  },
  {
    id: 'g036',
    prompt:
      'What is the name of the Speaker of the House of Representatives now?',
    acceptableAnswers: ['Mike Johnson', 'Johnson'],
    dynamic: true,
  },
  {
    id: 'g037',
    prompt: 'Who does a U.S. senator represent?',
    acceptableAnswers: [
      'People of their state',
      'Citizens of their state',
      'All people of the state',
    ],
  },
  {
    id: 'g038',
    prompt: 'Who elects U.S. senators?',
    acceptableAnswers: [
      'Citizens from their state',
      'The people of the state',
      'Voters of the state',
    ],
  },
  {
    id: 'g039',
    prompt: 'Who does a member of the House of Representatives represent?',
    acceptableAnswers: [
      'People of their congressional district',
      'People of the district',
      'Citizens of the district',
    ],
  },
  {
    id: 'g040',
    prompt: 'Who elects members of the House of Representatives?',
    acceptableAnswers: [
      'Citizens from their congressional district',
      'People of the district',
      'Voters of the district',
    ],
  },
  {
    id: 'g041',
    prompt: 'Some states have more representatives than other states. Why?',
    acceptableAnswers: [
      'Because of the state’s population',
      'More people',
      'Larger population',
      'Because they have more people',
    ],
  },
  {
    id: 'g042',
    prompt: 'The President of the United States can serve only two terms. Why?',
    acceptableAnswers: [
      'Because of the 22nd Amendment',
      'The twenty-second Amendment',
      'To keep the president from becoming too powerful',
    ],
  },
  {
    id: 'g043',
    prompt: 'Name one power of the President.',
    acceptableAnswers: [
      'Signs bills into law',
      'Signs bills',
      'Vetoes bills',
      'Enforces laws',
      'Commander in Chief of the military',
      'Chief diplomat',
    ],
  },
  {
    id: 'g044',
    prompt: 'Who signs bills to become laws?',
    acceptableAnswers: ['The President'],
    negativeTokens: ['vice'],
  },
  {
    id: 'g045',
    prompt: 'Who vetoes bills?',
    acceptableAnswers: ['The President'],
    negativeTokens: ['vice'],
  },
  {
    id: 'g046',
    prompt: 'Who appoints federal judges?',
    acceptableAnswers: ['The President'],
    negativeTokens: ['vice'],
  },
  {
    id: 'g047',
    prompt: 'The executive branch has many parts. Name one.',
    acceptableAnswers: [
      'The President',
      'The Cabinet',
      'Federal departments and agencies',
      'Federal agencies',
    ],
  },
  {
    id: 'g048',
    prompt: "What does the President's Cabinet do?",
    acceptableAnswers: ['Advises the President'],
  },
  {
    id: 'g049',
    prompt: 'What are two Cabinet-level positions?',
    acceptableAnswers: [
      'Secretary of State',
      'Secretary of Defense',
      'Secretary of the Treasury',
      'Attorney General',
      'Secretary of Labor',
      'Secretary of Education',
      'Secretary of Agriculture',
      'Secretary of Commerce',
      'Secretary of Energy',
      'Secretary of Health and Human Services',
      'Secretary of Homeland Security',
      'Secretary of Housing and Urban Development',
      'Secretary of the Interior',
      'Secretary of Transportation',
      'Secretary of Veterans Affairs',
      'Vice President',
    ],
    requiredCount: 2,
  },
  {
    id: 'g050',
    prompt: 'How many Supreme Court justices are usually needed to decide a case?',
    acceptableAnswers: ['Five (5)'],
  },
  {
    id: 'g051',
    prompt: 'How long do Supreme Court justices serve?',
    acceptableAnswers: ['For life', 'Lifetime appointment', 'Until retirement'],
  },
  {
    id: 'g052',
    prompt: 'Supreme Court justices serve for life. Why?',
    acceptableAnswers: [
      'To be independent of politics',
      'To limit outside influence',
      'So they are not influenced by politics',
    ],
  },
  {
    id: 'g053',
    prompt: 'Who is the Chief Justice of the United States now?',
    acceptableAnswers: ['John Roberts', 'Roberts'],
    dynamic: true,
  },
  {
    // State-dependent; excluded from interview draws - see INTERVIEW_POOLS.
    id: 'g054',
    prompt: 'Who is the governor of your state now?',
    acceptableAnswers: ['Answers will vary by state'],
    dynamic: true,
  },
  {
    // State-dependent; excluded from interview draws - see INTERVIEW_POOLS.
    id: 'g055',
    prompt: 'What is the capital of your state?',
    acceptableAnswers: ['Answers will vary by state'],
  },
  {
    id: 'g057',
    prompt: 'Why is the Electoral College important?',
    acceptableAnswers: [
      'It decides who is elected President',
      'It elects the President',
      'A compromise between popular election and congressional selection',
    ],
  },
  {
    id: 'g058',
    prompt: 'What is one part of the judicial branch?',
    acceptableAnswers: [
      'The Supreme Court',
      'Federal courts',
      'District courts',
      'Courts of appeal',
    ],
  },
  {
    id: 'g059',
    prompt: 'What does the judicial branch do?',
    acceptableAnswers: [
      'Reviews and explains laws',
      'Reviews laws',
      'Explains laws',
      'Interprets laws',
      'Resolves disputes',
      'Decides if a law goes against the Constitution',
    ],
  },
  {
    id: 'g060',
    prompt: 'Name one power that is only for the federal government.',
    acceptableAnswers: [
      'Print money',
      'Print paper money',
      'Mint coins',
      'Declare war',
      'Create an army',
      'Make treaties',
      'Set foreign policy',
    ],
  },
  {
    id: 'g061',
    prompt: 'Name one power that is only for the states.',
    acceptableAnswers: [
      'Provide schooling and education',
      'Provide education',
      'Provide police protection',
      'Provide fire departments',
      "Give a driver's license",
      'Give drivers licenses',
      'Approve zoning and land use',
    ],
  },
  {
    id: 'g062',
    prompt: 'What is the purpose of the 10th Amendment?',
    acceptableAnswers: [
      'Powers not given to the federal government belong to the states or to the people',
      'Powers belong to the states or the people',
      'The states keep powers not given to the federal government',
    ],
  },
  {
    id: 'r001',
    prompt: 'What does the Bill of Rights protect?',
    acceptableAnswers: [
      'The basic rights of Americans',
      'Rights of Americans',
      'The rights of people living in the United States',
    ],
  },
  {
    id: 'r002',
    prompt:
      'Who can vote in federal elections, run for federal office, and serve on a jury?',
    acceptableAnswers: ['U.S. citizens', 'Citizens'],
  },
  {
    id: 'r003',
    prompt: 'What do we show loyalty to when we say the Pledge of Allegiance?',
    acceptableAnswers: ['The United States', 'The flag'],
  },
  {
    id: 'r004',
    prompt: 'How can people become U.S. citizens?',
    acceptableAnswers: [
      'Naturalization',
      'Naturalize',
      'Be born in the United States',
      'Born in the U.S.',
      'Derive citizenship',
    ],
  },
  {
    id: 'r005',
    prompt: 'Why is it important to pay federal taxes?',
    acceptableAnswers: [
      'Required by law',
      'It is the law',
      'To fund the federal government',
      'Civic duty',
      'Required by the Constitution',
    ],
  },
  {
    id: 'r006',
    prompt:
      'What are three rights of everyone living in the United States?',
    acceptableAnswers: [
      'Freedom of speech',
      'Freedom of expression',
      'Freedom of assembly',
      'Freedom to petition the government',
      'Freedom of religion',
      'The right to bear arms',
      'Speech',
      'Expression',
      'Assembly',
      'Religion',
      'Petition the government',
      'Bear arms',
    ],
    requiredCount: 3,
  },
  {
    id: 'r007',
    prompt: 'Name two promises new citizens make in the Oath of Allegiance.',
    acceptableAnswers: [
      'Give up loyalty to other countries',
      'Defend the Constitution',
      'Obey the laws of the United States',
      'Obey the laws',
      'Serve in the military if needed',
      'Serve the nation if needed',
      'Be loyal to the United States',
    ],
    requiredCount: 2,
  },
  {
    id: 'r008',
    prompt:
      'It is important for all men age 18 through 25 to register for the Selective Service. Name one reason why.',
    acceptableAnswers: [
      'Required by law',
      'It is the law',
      'Civic duty',
      'Makes the draft fair',
    ],
  },
  {
    id: 'r009',
    prompt:
      'There are four amendments to the U.S. Constitution about who can vote. Describe one.',
    acceptableAnswers: [
      'Citizens eighteen (18) and older can vote',
      'Eighteen and older',
      'You do not have to pay a poll tax to vote',
      'No poll tax',
      'Any citizen can vote',
      'Women and men can vote',
      'Citizens of any race can vote',
    ],
  },
  {
    id: 'r010',
    prompt: 'What are two examples of civic participation?',
    acceptableAnswers: [
      'Vote',
      'Run for office',
      'Join a political party',
      'Help with a campaign',
      'Join a civic group',
      'Join a community group',
      'Contact elected officials',
      'Give an elected official your opinion',
      'Support or oppose an issue',
      'Write to a newspaper',
    ],
    requiredCount: 2,
  },
  {
    id: 'r011',
    prompt: 'What is one way Americans can serve their country?',
    acceptableAnswers: [
      'Vote',
      'Pay taxes',
      'Obey the law',
      'Serve in the military',
      'Join the military',
      'Run for office',
      'Work for the government',
    ],
  },
  {
    id: 'h001',
    prompt: 'Who wrote the Declaration of Independence?',
    acceptableAnswers: ['Thomas Jefferson', 'Jefferson'],
  },
  {
    id: 'h002',
    prompt: 'When was the Declaration of Independence adopted?',
    acceptableAnswers: ['July 4, 1776', 'July 4th, 1776', 'July fourth, 1776'],
  },
  {
    id: 'h003',
    prompt:
      'What war did the Americans fight to win independence from Britain?',
    acceptableAnswers: [
      'The American Revolution',
      'The Revolutionary War',
      'The American Revolutionary War',
      'The War for Independence',
    ],
  },
  {
    id: 'h004',
    prompt: 'What founding document was written in 1787?',
    acceptableAnswers: ['The Constitution', 'The U.S. Constitution'],
  },
  {
    id: 'h005',
    prompt: 'Who lived in America before Europeans arrived?',
    acceptableAnswers: ['Native Americans', 'American Indians'],
  },
  {
    id: 'h006',
    prompt: 'What territory did the United States buy from France in 1803?',
    acceptableAnswers: ['The Louisiana Territory', 'Louisiana'],
  },
  {
    id: 'h007',
    prompt: 'Name the U.S. war between the North and the South.',
    acceptableAnswers: ['The Civil War', 'The War between the States'],
  },
  {
    id: 'h008',
    prompt: 'What did the Emancipation Proclamation do?',
    acceptableAnswers: [
      'Freed the slaves',
      'Freed slaves in the Confederacy',
      'Freed slaves in the Confederate states',
      'Freed slaves in most Southern states',
    ],
  },
  {
    id: 'h009',
    prompt: 'Who was President during the Great Depression and World War II?',
    acceptableAnswers: ['Franklin Roosevelt', 'FDR', 'Roosevelt'],
  },
  {
    id: 'h010',
    prompt:
      'What major event happened on September 11, 2001 in the United States?',
    acceptableAnswers: [
      'Terrorists attacked the United States',
      'Terrorist attacks',
      'The attacks on the World Trade Center',
    ],
  },
  {
    id: 'h011',
    prompt: 'What war ended slavery?',
    acceptableAnswers: ['The Civil War'],
  },
  {
    id: 'h012',
    prompt: 'When did women get the right to vote?',
    acceptableAnswers: [
      '1920',
      'The 19th Amendment',
      'The nineteenth Amendment',
      'After World War I',
    ],
  },
  {
    id: 'h013',
    prompt: 'The colonists came to America for many reasons. Name one.',
    acceptableAnswers: [
      'Freedom',
      'Political liberty',
      'Religious freedom',
      'Economic opportunity',
      'To escape persecution',
      'To practice their religion',
    ],
  },
  {
    id: 'h014',
    prompt: 'What group of people was taken and sold as slaves?',
    acceptableAnswers: ['Africans', 'People from Africa'],
  },
  {
    id: 'h015',
    prompt:
      'Name one reason why the Americans declared independence from Britain.',
    acceptableAnswers: [
      'High taxes',
      'Taxation without representation',
      'The British army stayed in their houses',
      'No self-government',
      'The Boston Massacre',
      'The Boston Tea Party',
      'The Stamp Act',
    ],
  },
  {
    id: 'h016',
    prompt: 'The American Revolution had many important events. Name one.',
    acceptableAnswers: [
      'The Battle of Bunker Hill',
      'The Declaration of Independence',
      'Washington crossing the Delaware',
      'The Battle of Trenton',
      'The Battle of Saratoga',
      'Valley Forge',
      'The Battle of Yorktown',
    ],
  },
  {
    id: 'h017',
    prompt: 'There were 13 original states. Name five.',
    acceptableAnswers: [
      'New Hampshire',
      'Massachusetts',
      'Rhode Island',
      'Connecticut',
      'New York',
      'New Jersey',
      'Pennsylvania',
      'Delaware',
      'Maryland',
      'Virginia',
      'North Carolina',
      'South Carolina',
      'Georgia',
    ],
    requiredCount: 5,
  },
  {
    id: 'h018',
    prompt:
      'The Federalist Papers supported the passage of the U.S. Constitution. Name one of the writers.',
    acceptableAnswers: [
      'James Madison',
      'Alexander Hamilton',
      'John Jay',
      'Madison',
      'Hamilton',
      'Jay',
      'Publius',
    ],
  },
  {
    id: 'h019',
    prompt: 'Why were the Federalist Papers important?',
    acceptableAnswers: [
      'They helped people understand the Constitution',
      'They supported passing the Constitution',
      'To support ratification of the Constitution',
    ],
  },
  {
    id: 'h020',
    prompt: 'Name one thing Benjamin Franklin is famous for.',
    acceptableAnswers: [
      'A Founding Father',
      'A diplomat',
      'An inventor',
      'First Postmaster General',
      'Writer of Poor Richards Almanac',
      'Started the first free libraries',
      'Oldest member of the Constitutional Convention',
    ],
  },
  {
    id: 'h021',
    prompt: 'Name one thing George Washington is famous for.',
    acceptableAnswers: [
      'The first President',
      'Father of Our Country',
      'General of the Continental Army',
      'President of the Constitutional Convention',
    ],
  },
  {
    id: 'h022',
    prompt: 'Name one thing Thomas Jefferson is famous for.',
    acceptableAnswers: [
      'Wrote the Declaration of Independence',
      'Writer of the Declaration of Independence',
      'The third President',
      'The Louisiana Purchase',
      'Doubled the size of the United States',
      'First Secretary of State',
      'Founded the University of Virginia',
    ],
  },
  {
    id: 'h023',
    prompt: 'Name one thing James Madison is famous for.',
    acceptableAnswers: [
      'Father of the Constitution',
      'The fourth President',
      'President during the War of 1812',
      'A writer of the Federalist Papers',
    ],
  },
  {
    id: 'h024',
    prompt: 'Name one thing Alexander Hamilton is famous for.',
    acceptableAnswers: [
      'First Secretary of the Treasury',
      'A writer of the Federalist Papers',
      'Helped establish the First Bank of the United States',
      'Aide to General Washington',
      'Member of the Continental Congress',
    ],
  },
  {
    id: 'h025',
    prompt: 'Name one war fought by the United States in the 1800s.',
    acceptableAnswers: [
      'The Civil War',
      'The War of 1812',
      'The Mexican-American War',
      'The Spanish-American War',
    ],
  },
  {
    id: 'h026',
    prompt: 'The Civil War had many important events. Name one.',
    acceptableAnswers: [
      'The Emancipation Proclamation',
      'The Battle of Fort Sumter',
      'The Battle of Vicksburg',
      'The Battle of Gettysburg',
      'Shermans March',
      'The surrender at Appomattox',
      'The Battle of Antietam',
      'Lincolns assassination',
    ],
  },
  {
    id: 'h027',
    prompt: 'Name one thing Abraham Lincoln is famous for.',
    acceptableAnswers: [
      'Freed the slaves',
      'The Emancipation Proclamation',
      'Saved the Union',
      'Preserved the Union',
      'Led the United States during the Civil War',
      'The 16th President',
      'The sixteenth President',
      'The Gettysburg Address',
    ],
  },
  {
    id: 'h028',
    prompt:
      'What amendment says all persons born or naturalized in the United States, and subject to the jurisdiction thereof, are U.S. citizens?',
    acceptableAnswers: ['The 14th Amendment', 'The fourteenth Amendment'],
  },
  {
    id: 'h029',
    prompt: 'When did all men get the right to vote?',
    acceptableAnswers: [
      'After the Civil War',
      'During Reconstruction',
      'The 15th Amendment',
      'The fifteenth Amendment',
      '1870',
    ],
  },
  {
    id: 'h030',
    prompt: "Name one leader of the women's rights movement in the 1800s.",
    acceptableAnswers: [
      'Susan B. Anthony',
      'Susan Anthony',
      'Elizabeth Cady Stanton',
      'Sojourner Truth',
      'Harriet Tubman',
      'Lucretia Mott',
      'Lucy Stone',
    ],
  },
  {
    id: 'h031',
    prompt: 'Name one war fought by the United States in the 1900s.',
    acceptableAnswers: [
      'World War II',
      'World War 2',
      'World War I',
      'World War 1',
      'The Korean War',
      'The Vietnam War',
      'The Persian Gulf War',
      'The Gulf War',
    ],
  },
  {
    id: 'h032',
    prompt: 'Why did the United States enter World War I?',
    acceptableAnswers: [
      'Because Germany attacked U.S. ships',
      'Germany attacked American ships',
      'To support the Allied Powers',
      'To support the Allies',
      'To oppose the Central Powers',
    ],
  },
  {
    id: 'h033',
    prompt: 'What was the Great Depression?',
    acceptableAnswers: [
      'The longest economic recession in modern history',
      'A long economic recession',
      'The economy collapsed',
    ],
  },
  {
    id: 'h034',
    prompt: 'When did the Great Depression start?',
    acceptableAnswers: [
      'The stock market crash of 1929',
      '1929',
      'The Great Crash',
    ],
  },
  {
    id: 'h035',
    prompt: 'Why did the United States enter World War II?',
    acceptableAnswers: [
      'Pearl Harbor',
      'Japan attacked Pearl Harbor',
      'To support the Allied Powers',
      'To oppose the Axis Powers',
    ],
  },
  {
    id: 'h036',
    prompt: 'Name one thing Dwight Eisenhower is famous for.',
    acceptableAnswers: [
      'A general during World War II',
      'World War II general',
      'President during the Korean War',
      'The 34th President',
      'Created the Interstate Highway System',
      'Signed the Federal-Aid Highway Act',
    ],
  },
  {
    id: 'h037',
    prompt: 'Who was the main rival of the United States during the Cold War?',
    acceptableAnswers: ['The Soviet Union', 'The USSR', 'Russia'],
  },
  {
    id: 'h038',
    prompt: 'During the Cold War, what was one main concern of the United States?',
    acceptableAnswers: ['Communism', 'Nuclear war'],
  },
  {
    id: 'h039',
    prompt: 'Why did the United States enter the Korean War?',
    acceptableAnswers: ['To stop the spread of communism'],
  },
  {
    id: 'h040',
    prompt: 'Why did the United States enter the Vietnam War?',
    acceptableAnswers: ['To stop the spread of communism'],
  },
  {
    id: 'h041',
    prompt: 'What did the civil rights movement do?',
    acceptableAnswers: [
      'Fought to end racial discrimination',
      'Fought for equal rights',
      'Fought to end segregation',
    ],
  },
  {
    id: 'h042',
    prompt: 'Name one thing Martin Luther King Jr. is famous for.',
    acceptableAnswers: [
      'Fought for civil rights',
      'Worked for equality for all Americans',
      'A civil rights leader',
      'Led the civil rights movement',
    ],
  },
  {
    id: 'h043',
    prompt: 'Why did the United States enter the Persian Gulf War?',
    acceptableAnswers: [
      'To remove Iraqi forces from Kuwait',
      'To force the Iraqi military from Kuwait',
    ],
  },
  {
    id: 'h044',
    prompt:
      'Name one U.S. military conflict after the September 11, 2001 attacks.',
    acceptableAnswers: [
      'The War in Afghanistan',
      'The War in Iraq',
      'The War on Terror',
    ],
  },
  {
    id: 'h045',
    prompt: 'Name one American Indian tribe in the United States.',
    acceptableAnswers: [
      'Cherokee',
      'Navajo',
      'Sioux',
      'Apache',
      'Chippewa',
      'Choctaw',
      'Pueblo',
      'Iroquois',
      'Creek',
      'Blackfeet',
      'Seminole',
      'Cheyenne',
      'Lakota',
      'Crow',
      'Mohawk',
      'Shawnee',
      'Hopi',
      'Huron',
      'Oneida',
    ],
  },
  {
    id: 'h046',
    prompt: 'Name one American innovation.',
    acceptableAnswers: [
      'The light bulb',
      'The airplane',
      'The automobile',
      'Skyscrapers',
      'The assembly line',
      'Landing on the moon',
      'The integrated circuit',
    ],
  },
  {
    id: 's001',
    prompt: 'What is the capital of the United States?',
    acceptableAnswers: ['Washington, D.C.', 'Washington DC', 'Washington'],
    negativeTokens: ['state'],
  },
  {
    id: 's002',
    prompt: 'Why does the flag have 13 stripes?',
    acceptableAnswers: [
      'Because there were 13 original colonies',
      'The 13 original colonies',
      'They represent the original colonies',
    ],
  },
  {
    id: 's003',
    prompt: 'Why does the flag have 50 stars?',
    acceptableAnswers: [
      'One star for each state',
      'Each star represents a state',
      'There are 50 states',
    ],
  },
  {
    id: 's004',
    prompt: 'What is the national anthem?',
    acceptableAnswers: ['The Star-Spangled Banner'],
  },
  {
    id: 's005',
    prompt:
      "The Nation's first motto was 'E Pluribus Unum.' What does that mean?",
    acceptableAnswers: ['Out of many, one', 'We all become one'],
  },
  {
    id: 's006',
    prompt: 'What is Memorial Day?',
    acceptableAnswers: [
      'A holiday to honor soldiers who died in military service',
      'Honors soldiers that died',
      'A day for soldiers that died in service',
    ],
  },
  {
    id: 's007',
    prompt: 'What is Independence Day?',
    acceptableAnswers: [
      'A holiday to celebrate U.S. independence from Britain',
      'Celebrates independence',
      "The country's birthday",
      'July 4th',
    ],
  },
  {
    id: 's008',
    prompt: 'Where is the Statue of Liberty?',
    acceptableAnswers: [
      'New York Harbor',
      'Liberty Island',
      'New York',
      'New Jersey',
      'On the Hudson River',
    ],
  },
  {
    id: 's009',
    prompt: 'Name three national holidays.',
    acceptableAnswers: [
      'Independence Day',
      'Thanksgiving',
      'Christmas',
      'New Years Day',
      'Martin Luther King Jr. Day',
      'Martin Luther King Day',
      'Presidents Day',
      'Memorial Day',
      'Juneteenth',
      'Labor Day',
      'Columbus Day',
      'Veterans Day',
    ],
    requiredCount: 3,
  },
  {
    id: 's010',
    prompt: 'What is Veterans Day?',
    acceptableAnswers: [
      'A holiday to honor people in the military',
      'Honors people that served in the military',
      'A day to honor veterans',
    ],
  },
];

/**
 * The 20 questions USCIS designates for 65/20 special consideration on the
 * 2025 test - mirrors the website's SIXTY_FIVE_TWENTY_IDS exactly.
 */
export const REDUCED_2025_IDS: string[] = [
  'g001',
  'g003',
  'g004',
  'g009',
  'g010',
  'g011',
  'g012',
  'g029',
  'g036',
  'g045',
  'g054',
  'h001',
  'h005',
  'h010',
  'h021',
  'h027',
  'h042',
  'r003',
  's002',
  's009',
];

/**
 * Questions whose answer depends on the user's state/district. The app cannot
 * verify these offline, so interview draws exclude them (the website replaces
 * them with personalized questions instead).
 */
export const STATE_DEPENDENT_2025_IDS: string[] = ['g030', 'g035', 'g054', 'g055'];
