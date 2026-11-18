export type Language = 'en' | 'hi' | 'hinglish'
export type Sentiment = 0 | 1 | 2 | 3 | 4 | 5

export type PhraseSet = {
  opening: string[]
  details: string[]
  item: string[]
  closing: string[]
}

export type PhraseLibrarySource = Partial<Record<Language, Partial<Record<Sentiment, Partial<PhraseSet>>>>>

export const phraseLibrary: Record<Language, Record<Sentiment, PhraseSet>> = {
  en: {
    0: {
      opening: ['I recently visited {business}.', 'I stopped by {business} to look around.', 'I had a chance to visit {business}.', 'I checked out {business} recently.'],
      details: ['The team shared information about the available options.', 'I got to explore the options and ask a few questions.', 'There were several things to consider before making a decision.', 'I spent some time understanding what was available.'],
      item: ['I was particularly interested in {item}.', 'I took a closer look at {item}.', 'I asked about the available {item}.'],
      closing: ['Sharing my experience for anyone planning a visit.', 'It was useful to see the options in person.', 'The visit helped me understand the choices better.', 'I appreciated having a chance to look around.']
    },
    1: {
      opening: ['My experience at {business} was disappointing.', 'I left {business} feeling quite unhappy.', 'Unfortunately, my visit to {business} did not go well.', 'I expected a better experience from {business}.'],
      details: ['The information I needed was not explained properly.', 'Getting clear assistance was more difficult than it should have been.', 'The service felt disorganized and frustrating.', 'My questions were not addressed clearly.'],
      item: ['I needed more guidance about {item}.', 'I had trouble getting helpful details about {item}.', 'The options for {item} were not explained well.'],
      closing: ['There is a lot of room for improvement.', 'I hope the team takes this feedback seriously.', 'Overall, it was not a satisfying visit.', 'I would like to see better service next time.']
    },
    2: {
      opening: ['My visit to {business} could have been better.', 'I had a mixed experience at {business}.', 'The experience at {business} was below my expectations.', 'I expected a little more from {business}.'],
      details: ['Some questions took longer than expected to answer.', 'The service was inconsistent and could use improvement.', 'I had to ask more than once for the details I needed.', 'A bit more attention would have made a difference.'],
      item: ['I wanted clearer information about {item}.', 'I needed extra help comparing {item}.', 'The guidance around {item} could have been more useful.'],
      closing: ['Hopefully the experience improves in future.', 'There are a few things the team could do better.', 'It was not the smooth visit I had hoped for.', 'Better communication would really help.']
    },
    3: {
      opening: ['My experience at {business} was okay overall.', 'I had an average experience at {business}.', 'My visit to {business} was fairly straightforward.', 'The experience at {business} was decent.'],
      details: ['The team answered most of my questions.', 'The service was fine, though there is room to improve.', 'I was able to look through the available options.', 'Things went reasonably well without standing out.'],
      item: ['I also checked out {item}.', 'I spent time comparing {item}.', 'I asked the team about {item}.'],
      closing: ['Overall, it was a reasonable experience.', 'There were both good points and areas to improve.', 'I would call it a decent visit.', 'A few small improvements would make it better.']
    },
    4: {
      opening: ['I had a good experience at {business}.', 'My visit to {business} went well.', 'I enjoyed my time at {business}.', 'The experience at {business} was positive.'],
      details: ['The staff were helpful and answered my questions clearly.', 'The team was friendly and made the process simple.', 'I appreciated the patient guidance from the staff.', 'The service was smooth and the team was attentive.'],
      item: ['They helped me understand the {item} options.', 'I got useful guidance while exploring {item}.', 'The team explained the differences between {item} clearly.'],
      closing: ['I would happily recommend giving them a visit.', 'Overall, a pleasant and easy experience.', 'I left feeling satisfied with the service.', 'I would consider visiting again.']
    },
    5: {
      opening: ['Really happy with my purchase from {business}.', 'I had an excellent experience at {business}.', 'A fantastic experience from start to finish at {business}.', 'I am very pleased with my visit to {business}.'],
      details: ['The staff explained everything clearly and made choosing easy.', 'The team was knowledgeable, friendly, and genuinely helpful.', 'Every question was answered patiently and thoroughly.', 'The staff made everything simple, smooth, and comfortable.'],
      item: ['They helped me compare {item}.', 'I got great advice while comparing {item}.', 'The team helped me find the right option among {item}.'],
      closing: ['Everything went smoothly. Highly recommended!', 'I would definitely recommend them to anyone looking for great service.', 'I left very satisfied and would gladly visit again.', 'A wonderful experience that I would happily recommend.']
    }
  },
  hi: {
    0: {
      opening: ['मैं हाल ही में {business} गया था।', 'मैंने हाल में {business} विज़िट किया।', '{business} जाने का मौका मिला।'],
      details: ['वहाँ उपलब्ध विकल्पों के बारे में जानकारी मिली।', 'स्टाफ से कुछ ज़रूरी सवाल पूछने का मौका मिला।', 'अलग-अलग विकल्प समझने के लिए समय मिला।'],
      item: ['मैंने खास तौर पर {item} के बारे में पूछा।', 'मैंने {item} के विकल्प देखे।', '{item} की जानकारी लेने में मेरी रुचि थी।'],
      closing: ['अपना अनुभव साझा कर रहा हूँ।', 'विकल्पों को समझने के लिए यह विज़िट उपयोगी रही।', 'इससे मुझे चुनाव करने में मदद मिली।']
    },
    1: {
      opening: ['{business} में मेरा अनुभव निराशाजनक रहा।', '{business} जाकर मुझे काफी निराशा हुई।', 'मुझे {business} से बेहतर सेवा की उम्मीद थी।'],
      details: ['ज़रूरी जानकारी साफ़ तरीके से नहीं दी गई।', 'सहायता लेने में काफी परेशानी हुई।', 'मेरे सवालों का ठीक से जवाब नहीं मिला।'],
      item: ['{item} के बारे में सही मार्गदर्शन नहीं मिला।', '{item} की जानकारी समझाना बेहतर हो सकता था।', '{item} के विकल्प ठीक से नहीं बताए गए।'],
      closing: ['सेवा में काफी सुधार की ज़रूरत है।', 'उम्मीद है आगे यह अनुभव बेहतर होगा।', 'कुल मिलाकर मैं संतुष्ट नहीं था।']
    },
    2: {
      opening: ['{business} में मेरा अनुभव उम्मीद से कम रहा।', '{business} की विज़िट कुछ खास नहीं रही।', 'मुझे {business} में मिली-जुली सेवा मिली।'],
      details: ['कुछ सवालों के जवाब मिलने में देर हुई।', 'स्टाफ का मार्गदर्शन और बेहतर हो सकता था।', 'सेवा में थोड़ा अधिक ध्यान देने की ज़रूरत थी।'],
      item: ['{item} के बारे में अधिक स्पष्ट जानकारी चाहिए थी।', '{item} को समझने में थोड़ी परेशानी हुई।', '{item} के विकल्पों पर बेहतर मदद मिल सकती थी।'],
      closing: ['उम्मीद है अगली बार सुधार देखने को मिलेगा।', 'सेवा में कुछ बदलाव ज़रूरी हैं।', 'कुल अनुभव बेहतर हो सकता था।']
    },
    3: {
      opening: ['{business} में मेरा अनुभव ठीक-ठाक रहा।', 'मैंने {business} में सामान्य अनुभव किया।', '{business} की विज़िट कुल मिलाकर ठीक रही।'],
      details: ['स्टाफ ने मेरे ज्यादातर सवालों के जवाब दिए।', 'सेवा ठीक थी, हालांकि सुधार की गुंजाइश है।', 'मुझे उपलब्ध विकल्प देखने का मौका मिला।'],
      item: ['मैंने {item} के विकल्प भी देखे।', '{item} के बारे में पूछताछ की।', '{item} की तुलना करने में समय बिताया।'],
      closing: ['कुल मिलाकर अनुभव सामान्य रहा।', 'कुछ चीज़ें अच्छी थीं और कुछ बेहतर हो सकती हैं।', 'थोड़े सुधार से अनुभव अच्छा हो सकता है।']
    },
    4: {
      opening: ['{business} में मेरा अनुभव अच्छा रहा।', '{business} की विज़िट काफी अच्छी रही।', 'मुझे {business} की सेवा पसंद आई।'],
      details: ['स्टाफ ने मदद की और सवालों के जवाब स्पष्ट दिए।', 'टीम का व्यवहार अच्छा था और सब कुछ आसान लगा।', 'स्टाफ ने धैर्य से सही जानकारी दी।'],
      item: ['{item} के विकल्प समझने में अच्छी मदद मिली।', 'टीम ने {item} के बारे में उपयोगी जानकारी दी।', '{item} चुनने में सही मार्गदर्शन मिला।'],
      closing: ['कुल मिलाकर अच्छा अनुभव रहा।', 'मैं दूसरों को भी यहाँ आने की सलाह दूँगा।', 'इस सेवा से मैं संतुष्ट हूँ।']
    },
    5: {
      opening: ['{business} में मेरा अनुभव शानदार रहा।', '{business} की सेवा से मैं बहुत खुश हूँ।', 'मुझे {business} में बहुत अच्छा अनुभव मिला।'],
      details: ['स्टाफ ने हर बात अच्छे से समझाई और पूरा अनुभव आसान बना दिया।', 'टीम बहुत सहयोगी थी और हर सवाल का जवाब दिया।', 'स्टाफ का व्यवहार बहुत अच्छा और मददगार रहा।'],
      item: ['{item} चुनने में बहुत अच्छी मदद मिली।', 'टीम ने {item} के सभी विकल्प अच्छे से समझाए।', '{item} के बारे में उपयोगी सलाह मिली।'],
      closing: ['पूरा अनुभव बेहद आसान और शानदार रहा। ज़रूर सिफारिश करूँगा!', 'मैं यहाँ आने की सलाह ज़रूर दूँगा।', 'मैं पूरी तरह संतुष्ट हूँ और फिर आना चाहूँगा।']
    }
  },
  hinglish: {
    0: {
      opening: ['Recently {business} visit kiya.', '{business} jaakar options check kiye.', 'Main haal hi mein {business} gaya tha.'],
      details: ['Staff se available options ke baare mein baat hui.', 'Different choices dekhne aur questions poochhne ka chance mila.', 'Options samajhne mein thoda time diya.'],
      item: ['Main {item} ke options dekh raha tha.', '{item} ke baare mein bhi poochha.', '{item} ko detail mein check kiya.'],
      closing: ['Bas apna experience share kar raha hoon.', 'Overall visit informative rahi.', 'Choices samajhne mein help mili.']
    },
    1: {
      opening: ['{business} ka experience kaafi disappointing raha.', '{business} se better service expect ki thi.', 'Unfortunately {business} visit achhi nahi rahi.'],
      details: ['Questions ka clear answer nahi mila.', 'Help lene mein kaafi dikkat hui.', 'Service kaafi confusing aur frustrating lagi.'],
      item: ['{item} ke baare mein proper guidance nahi mili.', '{item} ki details clearly explain nahi hui.', '{item} samajhne mein help nahi mili.'],
      closing: ['Service mein improvement zaroori hai.', 'Hope hai team feedback par dhyan degi.', 'Overall experience satisfying nahi tha.']
    },
    2: {
      opening: ['{business} ka experience aur better ho sakta tha.', '{business} visit thodi disappointing rahi.', '{business} se thodi zyada expectations thi.'],
      details: ['Kuch questions ke answers milne mein time laga.', 'Staff ki guidance aur helpful ho sakti thi.', 'Service mein thoda improvement chahiye.'],
      item: ['{item} ke baare mein clear details chahiye thi.', '{item} compare karne mein extra help chahiye thi.', '{item} ki information better ho sakti thi.'],
      closing: ['Hope hai next time experience better hoga.', 'Communication mein improvement ki zaroorat hai.', 'Overall visit expected jitni smooth nahi thi.']
    },
    3: {
      opening: ['{business} ka experience theek-thaak raha.', '{business} visit overall okay thi.', 'Mera {business} experience average raha.'],
      details: ['Staff ne mostly questions ka answer diya.', 'Service okay thi, but improvement possible hai.', 'Options dekhne ka mauka mila.'],
      item: ['{item} ke options bhi check kiye.', '{item} ke baare mein poochha.', '{item} compare karne mein time diya.'],
      closing: ['Overall decent experience tha.', 'Kuch cheezein achhi thi, kuch better ho sakti hain.', 'Thodi improvement se experience aur achha hoga.']
    },
    4: {
      opening: ['{business} par kaafi achha experience raha.', '{business} visit really achhi rahi.', 'Mujhe {business} ki service pasand aayi.'],
      details: ['Staff helpful tha aur sab clearly explain kiya.', 'Team friendly thi aur process easy raha.', 'Staff ne patiently saare questions ke answers diye.'],
      item: ['{item} ke options achhe se explain kiye.', '{item} select karne mein helpful guidance mili.', '{item} ke baare mein useful advice mili.'],
      closing: ['Overall visit smooth aur pleasant thi.', 'Main definitely recommend karunga.', 'Service se kaafi satisfied hoon.']
    },
    5: {
      opening: ['{business} se purchase karke bahut happy hoon.', '{business} par amazing experience raha.', '{business} ki service really excellent thi.'],
      details: ['Staff ne sab features clearly explain kiye aur process easy banaya.', 'Team super helpful aur knowledgeable thi.', 'Har question ka patiently answer mila.'],
      item: ['{item} choose karne mein great guidance mili.', '{item} ke options clearly explain hue.', '{item} select karne mein team ne bahut help ki.'],
      closing: ['Overall experience smooth aur hassle-free tha. Highly recommended!', 'Definitely recommend karunga, bahut achha experience raha.', 'Main completely satisfied hoon aur phir aana chahunga.']
    }
  }
}
