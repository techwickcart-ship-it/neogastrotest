import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  User, 
  CheckCircle, 
  Clock, 
  Printer, 
  Trash2, 
  Eye, 
  X, 
  Calendar,
  AlertTriangle,
  FileCheck2,
  Lock,
  ChevronRight,
  ClipboardCheck,
  FileSignature,
  Stethoscope,
  ShieldAlert,
  Edit3,
  Download,
  CheckSquare,
  Languages
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabaseService } from '@/services/supabaseService';
import { useDataSync } from '@/hooks/useDataSync';
import { OTConsent } from '@/types';
import AnaesthesiaRecordSheet from './AnaesthesiaRecordSheet';
import AnaestheticOperationRecord from './AnaestheticOperationRecord';
import SurgeryConsentForm from './SurgeryConsentForm';
import PostOpForms from './PostOpForms';
import PoorPrognosisConsentModal from './PoorPrognosisConsentModal';
import GeneralConsentModal from './GeneralConsentModal';

// Standardized Anaesthesia Form Text matching GastroPlus Hospital official document
export const ANAESTHESIA_PREAMBLE = `I understand that anaesthesia services are needed so that my doctor can perform the operation or procedure. It has been explained to me that all forms of anaesthesia involve some risk and no guarantees or promises can be made concerning the results of my procedure or treatment. ALTHOUGH RARE, SEVERE UNEXPECTED COMPLICATIONS CAN OCCUR WITH EACH TYPE OF ANAESTHESIA, INCLUDING THE POSSIBILITY OF INFECTION, BLEEDING, DRUG REACTIONS, BLOOD CLOTS, LOSS OF SENSATION, LOSS OF VISION, LOSS OF LIMB FUNCTION, PARALYSIS, STROKE, BRAIN DAMAGE, HEART ATTACK OR DEATH. I understand that these risks apply to ALL forms of anaesthesia and that additional or specific risks have been identified below as they may apply to a specific type of anaesthesia. The type(s) of anaesthesia service checked below will be used for my procedure and that the anaesthesia technique to be used is determined by many factors including my physical condition, the type of procedure my doctor is to do, his or her preference, as well as my own desire. It has been explained to me that sometimes an anaesthesia technique that involves the use of local anaesthetics, with or without sedation, may not succeed completely and therefore another technique may have to be used including general anaesthesia. In case of unexpected difficult intubation / loss of airway, Emergency Tracheotomy / Cricothyroidotomy may have to be performed to save my life.`;

export const ANAESTHESIA_PREAMBLE_HINDI = `मैं समझता/समझती हूँ कि मेरे डॉक्टर द्वारा ऑपरेशन या प्रक्रिया करने के लिए एनेस्थीसिया (बेहोशी/सुन्न करने) सेवाओं की आवश्यकता है। मुझे यह समझाया गया है कि एनेस्थीसिया के सभी प्रकारों में कुछ जोखिम शामिल हैं और मेरी प्रक्रिया या उपचार के परिणामों के संबंध में कोई गारंटी या आश्वासन नहीं दिया जा सकता है। यद्यपि दुर्लभ हैं, फिर भी एनेस्थीसिया के प्रत्येक प्रकार के साथ गंभीर अप्रत्याशित जटिलताएं हो सकती हैं, जिसमें संक्रमण, रक्तस्राव, दवा की प्रतिक्रियाएं, रक्त के थक्के, संवेदनहीनता, दृष्टि हानि, अंगों की कार्यक्षमता में कमी, पक्षाघात (पैरालिसिस), स्ट्रोक, मस्तिष्क क्षति, दिल का दौरा या मृत्यु की संभावना शामिल है। मैं समझता/समझती हूँ कि ये जोखिम एनेस्थीसिया के सभी रूपों पर लागू होते हैं और यह कि विशिष्ट जोखिमों की पहचान नीचे की गई है। नीचे चिह्नित एनेस्थीसिया सेवा का उपयोग मेरी प्रक्रिया के लिए किया जाएगा। मुझे समझाया गया है कि स्थानीय एनेस्थीसिया का उपयोग करने वाली तकनीक कभी-कभी पूरी तरह से सफल नहीं हो सकती है और इसलिए सामान्य एनेस्थीसिया (पूर्ण बेहोशी) सहित अन्य तकनीक का उपयोग करना पड़ सकता है। अप्रत्याशित कठिन इंटुबेशन / वायुमार्ग के अवरुद्ध होने के मामले में, मेरे जीवन को बचाने के लिए आपातकालीन ट्रेकियोस्टॉमी / क्रिकोटायरायडोटॉमी की जानी पड़ सकती है।`;

export const ANAESTHESIA_DECLARATION = `I hereby consent to the anaesthesia service checked above and authorize that it be administered by Dr. Navodita Tiwari or his/her associates: all of whom are credentialed to provide anaesthesia service at Neo Gastroplus Hospital, I also consent to an alternative type of anaesthesia if necessary as deemed appropriate by them.
I certify and acknowledge that I have read this form or had it read to me, that I understand the risk, alternatives and expected result on the anaesthesia service and that I had ample time to ask questions and to consider my decision.`;

export const ANAESTHESIA_DECLARATION_HINDI = `उपरोक्त निश्चेतन की सेवाओं को सूची एवं जानकारी के उपरांत मैं डॉ. नवोदिता तिवारी एवं उनके सहयोगियों को जो निश्चेतन हेतु प्रशिक्षित एवं अनुभवी हैं व्यावसायिक निश्चेतन जो आवश्यक एवं उचित समझी जाये, के लिए अधिकृत एवं सहमति देता हूँ।
मैं यह प्रमाणित करता हूँ, कि इस प्रपत्र को मेरे द्वारा पढ़ा एवं समझा गया, निश्चेतन में निहित खतरे, विकल्प और वांछित परिणाम इत्यादि के बारे में संबंधित डॉ. द्वारा मेरे निर्णय पर विचार विमर्श कर मेरे सभी शंकाओं का समाधान मेरी भाषा जिस में भली भांति समझता हूँ में किया गया है।`;

export const ANAESTHESIA_MODALITIES_TABLE = [
  {
    id: 'general',
    name: 'General Anaesthesia',
    nameHindi: 'सामान्य एनेस्थीसिया (General Anaesthesia)',
    expectedResult: 'Total unconscious state, possible placement of a tube into the windpipe.',
    expectedResultHindi: 'पूर्ण अचेतन अवस्था, श्वास नली में ट्यूब लगाना।',
    technique: 'Drug injected into the bloodstream, breathed into the lungs, or other routes.',
    techniqueHindi: 'रक्तप्रवाह में दवा का इंजेक्शन, फेफड़ों में सांस द्वारा, या अन्य मार्ग।',
    risks: 'Mouth or throat pain, hoarseness, injury to mouth or teeth, awareness under anaesthesia, injury to blood vessels, vomiting, aspiration, pneumonia.',
    risksHindi: 'मुंह या गले में दर्द, आवाज बैठना, दांतों को क्षति, रक्त वाहिकाओं में चोट, उल्टी, निमोनिया।'
  },
  {
    id: 'spinalEpidural',
    name: 'Spinal or Epidural Analgesia/Anaesthesia',
    nameHindi: 'स्पाइनल या एपिड्यूरल एनेस्थीसिया / एनाल्जेसिया',
    subOption: 'With sedation / Without sedation',
    subOptionHindi: 'सेडेशन के साथ / बिना सेडेशन के',
    expectedResult: 'Temporary decreased or loss of feeling and / or movement in lower part of the body.',
    expectedResultHindi: 'शरीर के निचले हिस्से में दर्द और गति की अस्थायी कमी।',
    technique: 'Drug injected trough a needle/Catheter placed either directly into the fluid of the spinal canal or immediately outside the spinal canal.',
    techniqueHindi: 'रीढ़ की हड्डी के तरल पदार्थ या उसके ठीक बाहर सुई/कैथेटर द्वारा दवा देना।',
    risks: 'Headache, backache, buzzing in the ears, convulsions, infection, persistent weakness, numbness, residual pain, injury to blood vessels, "total spinal."',
    risksHindi: 'सिरदर्द, पीठ दर्द, कानों में बजना, दौरे, संक्रमण, सुन्नता, अवशिष्ट दर्द।'
  },
  {
    id: 'nerveBlock',
    name: 'Major/Minor Nerve Block',
    nameHindi: 'मेजर/माइनर नर्व ब्लॉक (Nerve Block)',
    subOption: 'With sedation / Without sedation',
    subOptionHindi: 'सेडेशन के साथ / बिना सेडेशन के',
    expectedResult: 'Temporary loss of feeling and/or movement of a specific limb or area.',
    expectedResultHindi: 'विशिष्ट अंग या क्षेत्र में संवेदनशीलता और गति की अस्थायी हानि।',
    technique: 'Drug injected near nerves providing loss of sensation to the area of the operation.',
    techniqueHindi: 'ऑपरेशन क्षेत्र को सुन्न करने के लिए तंत्रिकाओं (नसों) के पास दवा का इंजेक्शन।',
    risks: 'Infection, convulsions, weakness, persistent numbness, residual pain requiring additional anaesthesia, injury to blood vessels, failed block.',
    risksHindi: 'संक्रमण, दौरे, कमजोरी, लगातार सुन्नता, अतिरिक्त एनेस्थीसिया की आवश्यकता।'
  },
  {
    id: 'totalIntravenous',
    name: 'Total Intravenous Anaesthesia',
    nameHindi: 'टोटल इंट्रावेनस एनेस्थीसिया (TIVA)',
    expectedResult: 'Total loss of consciousness.',
    expectedResultHindi: 'चेतना की पूर्ण हानि (पूर्ण अचेतनता)।',
    technique: 'Drug given through Intravenous route.',
    techniqueHindi: 'इंट्रावेनस (नस के) मार्ग से दवा देना।',
    risks: 'Aspiration, respiratory depression, myocardial depression, tongue fall.',
    risksHindi: 'ऐस्पिरेशन, श्वसन अवसाद, मायोकार्डियल डिप्रेशन, जीभ का गिरना।'
  },
  {
    id: 'macWithSedation',
    name: 'Monitored Anaesthesia Care (With Sedation)',
    nameHindi: 'मॉनिटर की गई एनेस्थीसिया देखभाल (सेडेशन के साथ)',
    expectedResult: 'Reduced anxiety and pain, partial or total amnesia.',
    expectedResultHindi: 'चिंता और दर्द में कमी; आंशिक या पूर्ण स्मृति लोप।',
    technique: 'Drug injected into the bloodstream, breathed into the lungs, or by other routes producing a semi-conscious state.',
    techniqueHindi: 'रक्तप्रवाह, सांस या अन्य मार्ग से दवा देकर अर्ध-सचेत अवस्था उत्पन्न करना।',
    risks: 'An unconscious state, depressed breathing, injury to blood vessels.',
    risksHindi: 'अचेतन अवस्था, श्वास अवसाद, रक्त वाहिकाओं में चोट।'
  },
  {
    id: 'macWithoutSedation',
    name: 'Monitored Anaesthesia Care (Without Sedation)',
    nameHindi: 'मॉनिटर की गई एनेस्थीसिया देखभाल (बिना सेडेशन के)',
    expectedResult: 'Measurement of vital signs, availability of anesthesia provider for further intervention.',
    expectedResultHindi: 'महत्वपूर्ण संकेतों की माप, आगे के हस्तक्षेप के लिए एनेस्थीसिया प्रदाता की उपलब्धता।',
    technique: 'None.',
    techniqueHindi: 'कोई नहीं।',
    risks: 'Increased awareness, anxiety and/or discomfort.',
    risksHindi: 'बढ़ी हुई जागरूकता, चिंता और/या असुविधा।'
  }
];

const CONSENT_TEMPLATES: Record<string, { title: string; text: string }> = {
  'General': {
    title: 'General Admission & Diagnostic Treatment Consent',
    text: `1. CONSENT TO TREATMENT: I hereby authorize the medical, nursing, and administrative staff of GASTROPLUS HOSPITAL to administer diagnostics, lab tests, routine nursing interventions, and general non-invasive healthcare treatments deemed appropriate by my attending physicians.\n\n2. FINANCIAL DISCLOSURE: I understand that I am fully responsible for any charges incurred during my hospital visit that are not covered by insurance or government schemes.\n\n3. PRIVACY & RECORDS: I agree to the storage and sharing of my clinical data for ongoing care, billing, and regulatory audits in compliance with healthcare data protection standards.`
  },
  'Surgery': {
    title: 'Informed Surgical Procedure Consent',
    text: `1. AUTHORIZATION OF PROCEDURE: I authorize the primary surgeon and their assistants to perform the scheduled surgical operation on me. The nature, purpose, and scope of the surgery have been explained to me in detail.\n\n2. SURGICAL RISKS: I recognize that all surgical procedures carry inherent risks, including but not limited to severe hemorrhage, post-operative infection, scarring, adjacent organ injury, or cardiac event. No guarantee has been made regarding the absolute outcome of the surgery.\n\n3. EMERGENCY CLINICAL ALTERATIONS: If during the course of the surgery any unforeseen conditions arise requiring immediate actions, I authorize the surgical team to perform whatever procedures are medically necessary to save my life.`
  },
  'Minor Surgery': {
    title: 'Minor Surgical Procedure & Local Anesthesia Consent',
    text: `1. AUTHORIZATION OF MINOR SURGICAL PROCEDURE: I hereby authorize the treating surgeon and surgical team to perform the recommended minor surgical procedure (such as abscess incision & drainage, excision of cyst/lipoma, wound debridement/suturing, diagnostic biopsy, foreign body removal, or nail avulsion). The indications, benefits, and expected outcomes have been explained to me in detail.\n\n2. LOCAL ANESTHESIA & MINOR RISKS: I consent to local anesthesia / digital nerve block / field block as required. I understand minor surgery carries risks including mild localized bleeding, hematoma, localized infection, temporary numbness or pain at site, minor scarring, or need for repeat dressing or revision procedure.\n\n3. POST-PROCEDURE WOUND CARE: I agree to follow post-procedure wound care instructions, complete prescribed antibiotic or analgesic courses, and return immediately if excessive bleeding, high fever, or signs of severe infection occur.`
  },
  'Anaesthesia': {
    title: 'Consent for Anaesthesia Services',
    text: ANAESTHESIA_PREAMBLE
  },
  'Blood Transfusion': {
    title: 'Blood and Blood Product Transfusion Consent',
    text: `1. RECOMMENDATION OF THERAPY: I consent to the administration of blood, packed cells, platelets, fresh frozen plasma, or other blood products under the direction of my treating medical team.\n\n2. BENEFITS & CRITICAL RISKS: While blood screening minimizes risks, I acknowledge that transfusions carry minor risks (fever, allergic hives) and rare, critical risks (hemolytic transfusion reaction, transfusion-related acute lung injury (TRALI), bacterial contamination, or transmission of viral infections like Hepatitis or HIV).\n\n3. DIRECTED ALTERNATIVES: I have been briefed on alternative treatments such as iron therapy or volume expanders and understand why blood transfusion is recommended in my current clinical situation.`
  },
  'ICU': {
    title: 'Intensive Care Unit (ICU) Admission and Monitoring Consent',
    text: `1. ICU ADMISSION CRITERIA: I consent to my/the patient's admission to the Intensive Care Unit (ICU) for high-intensity clinical monitoring and multi-organ life support interventions.\n\n2. INVASIVE PROCEDURES: I understand that ICU care frequently requires invasive procedures, including central venous catheter insertion, arterial lines, endotracheal intubation, mechanical ventilation, renal dialysis, or temporary pacemaker placement.\n\n3. REAL-TIME PROGNOSIS: I acknowledge that critical illness is unstable, and the ICU team will provide regular clinical briefings. I understand that the primary goal is resuscitation, stabilizing major vitals, and preventing multi-organ failure.`
  },
  'High-risk': {
    title: 'High-Risk Surgical and Morbidity Consent',
    text: `1. CRITICAL DESIGNATION: I acknowledge that my planned procedure is classified as HIGH-RISK due to pre-existing co-morbidities (such as advanced heart failure, pulmonary dysfunction, renal impairment, or septic shock) or the complex anatomical nature of the surgery.\n\n2. ELEVATED MORTALITY DISCLOSURE: The medical team has explicitly explained to me and my next-of-kin that there is a significant, elevated risk of intra-operative or post-operative mortality (death) or severe, irreversible disability (e.g. major stroke, paralysis, permanent vegetative state).\n\n3. RESUSCITATION PREFERENCES: In signing this, I acknowledge that I want the medical team to undertake all logical resuscitative measures unless an active, verified DNR (Do Not Resuscitate) order is on file.`
  },
  'Endoscopy': {
    title: 'Informed Consent for Endoscopy, Colonoscopy & Minor GI Procedures',
    text: `1. NATURE OF PROCEDURE: I have been informed that I am undergoing diagnostic or therapeutic Endoscopy/Colonoscopy. The nature, purpose, clinical benefits, and alternative modalities of diagnosis/treatment have been fully explained to me.\n\n2. DISCLOSURE OF RISKS: I understand that endoscopy involves potential risks including transient sedation side effects, sore throat, post-procedure bloating or abdominal cramping, minor mucosal bleeding following biopsy or polypectomy, and extremely rare mucosal perforation (<0.05% diagnostic, <0.2% therapeutic) requiring surgical intervention.\n\n3. INFORMED CONSENT: I voluntarily give my informed consent for this procedure and authorize the attending endoscopist and gastroenterology team to perform any immediate therapeutic interventions deemed necessary.`
  }
};

const CONSENT_TEMPLATES_HINDI: Record<string, { title: string; text: string }> = {
  'General': {
    title: 'सामान्य भर्ती एवं नैदानिक उपचार सहमति पत्र',
    text: `1. उपचार हेतु सहमति: मैं इसके द्वारा गैस्ट्रोप्लस अस्पताल (GASTROPLUS HOSPITAL) के चिकित्सा, नर्सिंग एवं प्रशासनिक कर्मचारियों को मेरे उपस्थित चिकित्सकों द्वारा उचित समझे जाने वाले नैदानिक परीक्षणों, प्रयोगशाला जांचों, नियमित नर्सिंग हस्तक्षेपों और सामान्य उपचारों को प्रशासित करने के लिए अधिकृत करता/करती हूँ।\n\n2. वित्तीय प्रकटीकरण: मैं समझता/समझती हूँ कि अस्पताल में भर्ती के दौरान होने वाले सभी व्यय जो बीमा या सरकारी योजनाओं के अंतर्गत कवर नहीं हैं, उनके भुगतान के लिए मैं पूर्णतः उत्तरदायी हूँ।\n\n3. गोपनीयता एवं रिकॉर्ड: मैं स्वास्थ्य देखभाल डेटा सुरक्षा मानकों के अनुपालन में निरंतर देखभाल, बिलिंग और ऑडिट हेतु अपने नैदानिक डेटा के भंडारण और साझाकरण के लिए सहमति देता/देती हूँ।`
  },
  'Surgery': {
    title: 'ऑपरेशन / शल्य चिकित्सा सहमति पत्र',
    text: `1. प्रक्रिया का प्राधिकरण: मैं मुख्य शल्य चिकित्सक एवं उनकी सहायता टीम को मुझ पर निर्धारित ऑपरेशन करने के लिए अधिकृत करता/करती हूँ। ऑपरेशन की प्रकृति, उद्देश्य और दायरे को मुझे विस्तार से समझाया गया है।\n\n2. शल्य जोखिम: मैं स्वीकार करता/करती हूँ कि सभी शल्य प्रक्रियाओं में अंतर्निहित जोखिम शामिल हैं, जैसे कि अत्यधिक रक्तस्राव, संक्रमण, घाव के निशान, आसन्न अंगों को क्षति या हृदय संबंधी समस्या।\n\n3. आपातकालीन परिवर्तन: यदि ऑपरेशन के दौरान कोई अप्रत्याशित परिस्थिति उत्पन्न होती है जिसके लिए तत्काल कार्रवाई की आवश्यकता हो, तो मैं शल्य चिकित्सा टीम को जीवन रक्षा हेतु आवश्यक प्रक्रियाएं करने के लिए अधिकृत करता/करती हूँ।`
  },
  'Minor Surgery': {
    title: 'लघु शल्य चिकित्सा (माइनर सर्जरी) एवं लोकल एनेस्थीसिया सहमति पत्र',
    text: `1. लघु शल्य चिकित्सा हेतु अधिकार पत्र: मैं इसके द्वारा उपचारकर्ता शल्य चिकित्सक एवं टीम को सुझाई गई माइनर सर्जरी (जैसे एब्सेस ड्रेनेज/फोड़ा चिरान, पुटी/लिपोमा काटना, घाव की सफाई व टांके, बायोप्सी, बाहरी वस्तु निकालना, या नख उखाड़ना) करने के लिए अधिकृत करता/करती हूँ। इसके कारण, लाभ एवं परिणाम मुझे समझा दिए गए हैं।\n\n2. स्थानीय एनेस्थीसिया एवं जोखिम: मैं आवश्यकतानुसार लोकल एनेस्थीसिया / नर्व ब्लॉक के लिए सहमति देता/देती हूँ। मैं समझता/समझती हूँ कि माइनर सर्जरी में हल्का स्थानीय रक्तस्राव, सूजन, हल्का संक्रमण, अस्थायी सुन्नता, निशान पड़ना या पुनः ड्रेसिंग/टांके की आवश्यकता जैसे सामान्य जोखिम हो सकते हैं।\n\n3. ऑपरेशन पश्चात घाव की देखभाल: मैं सर्जरी के बाद घाव की देखभाल के निर्देशों का पालन करने, निर्धारित दवाएं लेने और अत्यधिक रक्तस्राव या संक्रमण के लक्षण होने पर तुरंत वापस रिपोर्ट करने की सहमति देता/देती हूँ।`
  },
  'Anaesthesia': {
    title: 'एनेस्थीसिया (बेहोशी/सुन्न करने) सेवाओं हेतु सहमति पत्र',
    text: ANAESTHESIA_PREAMBLE_HINDI
  },
  'Blood Transfusion': {
    title: 'रक्त एवं रक्त उत्पाद आधान सहमति पत्र',
    text: `1. चिकित्सा की सिफारिश: मैं अपने उपचारकर्ता मेडिकल टीम के निर्देशन में रक्त, पैक्ड सेल्स, प्लेटलेट्स, फ्रेश फ्रोजन प्लाज्मा या अन्य रक्त उत्पादों के आधान के लिए सहमति देता/देती हूँ।\n\n2. लाभ एवं गंभीर जोखिम: मैं स्वीकार करता/करती हूँ कि रक्त जांच जोखिमों को कम करती है, फिर भी ट्रांसफ्यूजन में मामूली जोखिम (बुखार, एलर्जी) और दुर्लभ गंभीर जोखिम (हेमोलिटिक ट्रांसफ्यूजन प्रतिक्रिया, ट्रांसफ्यूजन-संबंधित तीव्र फेफड़ों की चोट, वायरल संक्रमण का संचरण) शामिल हो सकते हैं।\n\n3. विकल्प: मुझे आयरन थेरेपी या वॉल्यूम एक्सपैंडर्स जैसे वैकल्पिक उपचारों के बारे में जानकारी दी गई है और मैं समझता/समझती हूँ कि मेरी वर्तमान स्थिति में रक्त आधान क्यों आवश्यक है।`
  },
  'ICU': {
    title: 'गहन चिकित्सा इकाई (ICU) प्रवेश एवं निगरानी सहमति पत्र',
    text: `1. आईसीयू प्रवेश मानदंड: मैं गहन नैदानिक निगरानी और जीवन समर्थन हस्तक्षेपों हेतु गहन चिकित्सा इकाई (ICU) में प्रवेश के लिए सहमति देता/देती हूँ।\n\n2. आक्रामक प्रक्रियाएं: मैं समझता/समझती हूँ कि आईसीयू देखभाल में अक्सर सेंट्रल वेनस कैथेटर, एर्टेरियल लाइन, एंडोट्रैचियल इंटुबेशन, मैकेनिकल वेंटिलेशन, या रीनल डायलिसिस जैसी आक्रामक प्रक्रियाओं की आवश्यकता होती है।\n\n3. वास्तविक समय पूर्वानुमान: मैं स्वीकार करता/करती हूँ कि गंभीर बीमारी अनिश्चित होती है, और प्राथमिक उद्देश्य पुनर्जीवन, मुख्य अंगों को स्थिर करना और मल्टी-ऑर्गन विफलता को रोकना है।`
  },
  'High-risk': {
    title: 'उच्च-जोखिम शल्य चिकित्सा सहमति पत्र',
    text: `1. गंभीर वर्गीकरण: मैं स्वीकार करता/करती हूँ कि पूर्व-मौजूद बीमारियों या ऑपरेशन की जटिल शारीरिक प्रकृति के कारण मेरी योजनाबद्ध प्रक्रिया को 'उच्च-जोखिम' (High-Risk) के रूप में वर्गीकृत किया गया है।\n\n2. उच्च मृत्यु दर प्रकटीकरण: मेडिकल टीम ने मुझे और मेरे परिजनों को स्पष्ट रूप से समझाया है कि ऑपरेशन के दौरान या बाद में मृत्यु या गंभीर, अपरिर्वतनीय विकलांगता (जैसे पैरालिसिस, स्ट्रोक, स्थायी वनस्पति अवस्था) का उच्च जोखिम है।\n\n3. पुनर्जीवन प्राथमिकताएं: मैं स्वीकार करता/करती हूँ कि जब तक कोई सक्रिय DNR आदेश न हो, मेडिकल टीम सभी तार्किक पुनर्जीवन उपाय करेगी।`
  },
  'Endoscopy': {
    title: 'एंडोस्कोपी, कोलोनोस्कोपी एवं लघु जीआई प्रक्रियाओं हेतु सूचित सहमति पत्र',
    text: `1. प्रक्रिया की प्रकृति एवं नैदानिक जानकारी: मुझे सूचित किया गया है कि मेरी एंडोस्कोपी / कोलोनोस्कोपी प्रक्रिया की जा रही है। संबंधित चिकित्सक द्वारा मुझे इस प्रक्रिया की प्रकृति, उद्देश्य, संभावित लाभ तथा वैकल्पिक उपचार/जांच विधियों के बारे में विस्तार से समझा दिया गया है।\n\n2. संभावित जोखिम एवं जटिलताओं का प्रकटीकरण: मैं समझता/समझती हूँ कि प्रक्रिया में सेडेशन के प्रभाव, गले में खराश, पेट में हल्का भारीपन/गैस, बायोप्सी या पॉलिप हटाने के उपरांत हल्का रक्तस्राव, तथा छिद्र होने का अत्यंत दुर्लभ जोखिम (<0.05% डायग्नोस्टिक, <0.2% थेरेप्यूटिक) शामिल हो सकता है।\n\n3. सूचित सहमति: मैं स्वेच्छा से इस प्रक्रिया हेतु अपनी सहमति प्रदान करता/करती हूँ और आवश्यक होने पर तत्काल चिकित्सीय हस्तक्षेप करने हेतु एंडोस्कोपिस्ट टीम को अधिकृत करता/करती हूँ।`
  }
};

const INITIAL_CONSENTS: OTConsent[] = [
  {
    id: 'ct-priyanka-01',
    patientId: 'p-priyanka',
    type: 'Anaesthesia',
    terms: ANAESTHESIA_PREAMBLE,
    patientName: 'PRIYANKA PARTE',
    guardianName: 'PRSHAILENDRA SINGH (HUSBAND)',
    witnessName: 'Dr. Navodita Tiwari',
    signedAt: '2026-07-17T08:30:00Z',
    signatureType: 'Digital',
    signatureData: 'PRIYANKA PARTE',
    status: 'Signed',
    uhidNo: 'LL/7209/MAY-2026',
    regNo: 'LL/7209/MAY-2026',
    procedureName: 'ETEP RE for ventral hernia c_ di varicath repair',
    doctorName: 'Dr. Navodita Tiwari',
    doctorSign: 'Dr. N. Tiwari',
    doctorSignedAt: '17/07/2026 08:30',
    relativeName: 'PRSHAILENDRA SINGH',
    relativeRelation: 'HUSBAND',
    relativeSign: 'P. Singh',
    relativeSignedAt: '17/07/2026 08:30',
    patientSign: 'Priyanka Parte',
    patientSignedAt: '17/07/2026 08:30',
    selectedAnaesthesiaTypes: {
      general: true,
      spinalEpidural: false,
      spinalEpiduralWithSedation: false,
      nerveBlock: false,
      nerveBlockWithSedation: false,
      regional: false,
      regionalWithSedation: false,
      macWithSedation: false,
      macWithoutSedation: false
    }
  },
  { id: 'ct-1', patientId: 'p1', type: 'General', terms: CONSENT_TEMPLATES['General'].text, patientName: 'Arjun Mehta', witnessName: 'Dr. Sarah Sharma', signedAt: '2026-07-01T10:00:00Z', signatureType: 'Typed', signatureData: 'Arjun Mehta', status: 'Signed' },
  { id: 'ct-2', patientId: 'p2', type: 'Surgery', terms: CONSENT_TEMPLATES['Surgery'].text, patientName: 'Ananya Iyer', witnessName: 'Nurse Deepika Roy', signedAt: '2026-07-02T14:30:00Z', signatureType: 'Typed', signatureData: 'Ananya Iyer', status: 'Signed' },
  { id: 'ct-3', patientId: 'p3', type: 'Anaesthesia', terms: CONSENT_TEMPLATES['Anaesthesia'].text, patientName: 'Rajesh Kumar', guardianName: 'Meena Kumar', witnessName: 'Dr. Alok Verma', signedAt: '2026-07-03T08:15:00Z', signatureType: 'Typed', signatureData: 'Rajesh Kumar', status: 'Signed' }
];

interface OTConsentManagementProps {
  patientId?: string;
}

export default function OTConsentManagement({ patientId }: OTConsentManagementProps = {}) {
  const [consents, setConsents] = useState<OTConsent[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingConsent, setViewingConsent] = useState<OTConsent | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'consents' | 'recordSheet' | 'surgeryForm' | 'anaestheticOpRecord'>('surgeryForm');

  // Patient dropdown search
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    uhidNo: '',
    regNo: 'LL/7209/MAY-2026',
    procedureName: '',
    type: 'Anaesthesia' as OTConsent['type'],
    terms: ANAESTHESIA_PREAMBLE,
    doctorName: 'Dr. Navodita Tiwari',
    doctorSign: 'Dr. N. Tiwari',
    guardianName: '',
    relativeName: '',
    relativeRelation: 'HUSBAND',
    relativeSign: '',
    witnessName: 'Nurse Deepika Roy',
    signatureData: '',
    status: 'Signed' as OTConsent['status']
  });

  // Language States for Forms & Display
  const [templateLanguage, setTemplateLanguage] = useState<'English' | 'Hindi' | 'Bilingual'>('English');
  const [formLanguage, setFormLanguage] = useState<'English' | 'Hindi' | 'Bilingual'>('English');
  const [viewLanguage, setViewLanguage] = useState<'English' | 'Hindi' | 'Bilingual'>('English');
  const [isPostOpAnaesthesiaModalOpen, setIsPostOpAnaesthesiaModalOpen] = useState(false);
  const [isPoorPrognosisOpen, setIsPoorPrognosisOpen] = useState(false);
  const [isGeneralConsentOpen, setIsGeneralConsentOpen] = useState(false);

  // Custom Anaesthesia Options
  const [anaesthesiaOptions, setAnaesthesiaOptions] = useState({
    general: true,
    spinalEpidural: false,
    spinalEpiduralWithSedation: false,
    nerveBlock: false,
    nerveBlockWithSedation: false,
    regional: false,
    regionalWithSedation: false,
    macWithSedation: false,
    macWithoutSedation: false
  });

  const fetchConsentsAndPatients = useCallback(async () => {
    try {
      // Load consents & patients in parallel
      const [storedCons, data] = await Promise.all([
        supabaseService.getOTConsents(),
        supabaseService.getPatients()
      ]);
      if (storedCons && storedCons.length > 0) {
        setConsents(storedCons);
      } else {
        setConsents(INITIAL_CONSENTS);
      }
      if (data) setPatients(data);
    } catch (err) {
      console.warn('Error fetching consents/patients:', err);
    }
  }, []);

  useEffect(() => {
    fetchConsentsAndPatients();
  }, [fetchConsentsAndPatients]);

  useDataSync(fetchConsentsAndPatients);

  const handleOpenAdd = (defaultType: OTConsent['type'] = 'Anaesthesia', lang: 'English' | 'Hindi' | 'Bilingual' = 'English') => {
    setFormLanguage(lang);
    const preselectedPat = patientId ? patients.find(p => p.id === patientId) : null;
    setPatientSearch(preselectedPat ? preselectedPat.name : '');
    
    let termsText = '';
    if (lang === 'Hindi') {
      termsText = CONSENT_TEMPLATES_HINDI[defaultType]?.text || '';
    } else if (lang === 'Bilingual') {
      const eng = CONSENT_TEMPLATES[defaultType]?.text || '';
      const hin = CONSENT_TEMPLATES_HINDI[defaultType]?.text || '';
      termsText = eng + '\n\n---\n\n' + hin;
    } else {
      termsText = CONSENT_TEMPLATES[defaultType]?.text || '';
    }

    setFormData({
      patientId: patientId || (preselectedPat ? preselectedPat.id : 'p-new-' + Date.now()),
      patientName: preselectedPat ? preselectedPat.name : '',
      uhidNo: preselectedPat ? preselectedPat.mrn : 'LL/7209/MAY-2026',
      regNo: 'LL/7209/MAY-2026',
      procedureName: defaultType === 'Anaesthesia' ? 'ETEP RE for ventral hernia c_ di varicath repair' : '',
      type: defaultType,
      terms: termsText,
      doctorName: 'Dr. Navodita Tiwari',
      doctorSign: 'Dr. N. Tiwari',
      guardianName: '',
      relativeName: '',
      relativeRelation: 'HUSBAND',
      relativeSign: '',
      witnessName: 'Nurse Deepika Roy',
      signatureData: '',
      status: 'Signed',
      language: lang as any
    });
    setAnaesthesiaOptions({
      general: true,
      spinalEpidural: false,
      spinalEpiduralWithSedation: false,
      nerveBlock: false,
      nerveBlockWithSedation: false,
      regional: false,
      regionalWithSedation: false,
      macWithSedation: false,
      macWithoutSedation: false
    });
    setIsAddOpen(true);
  };

  const handleTypeChange = (type: OTConsent['type']) => {
    let text = '';
    if (formLanguage === 'Hindi') {
      text = CONSENT_TEMPLATES_HINDI[type]?.text || '';
    } else if (formLanguage === 'Bilingual') {
      const eng = CONSENT_TEMPLATES[type]?.text || '';
      const hin = CONSENT_TEMPLATES_HINDI[type]?.text || '';
      text = eng + '\n\n---\n\n' + hin;
    } else {
      text = CONSENT_TEMPLATES[type]?.text || '';
    }

    setFormData(prev => ({
      ...prev,
      type,
      terms: text
    }));
  };

  const handleFormLanguageChange = (lang: 'English' | 'Hindi' | 'Bilingual') => {
    setFormLanguage(lang);
    
    let text = '';
    if (lang === 'Hindi') {
      text = CONSENT_TEMPLATES_HINDI[formData.type]?.text || '';
    } else if (lang === 'Bilingual') {
      const eng = CONSENT_TEMPLATES[formData.type]?.text || '';
      const hin = CONSENT_TEMPLATES_HINDI[formData.type]?.text || '';
      text = eng + '\n\n---\n\n' + hin;
    } else {
      text = CONSENT_TEMPLATES[formData.type]?.text || '';
    }

    setFormData(prev => ({
      ...prev,
      terms: text,
      language: lang as any
    }));
  };

  const handleSelectPatient = (pat: any) => {
    setFormData(prev => ({
      ...prev,
      patientId: pat.id,
      patientName: pat.name,
      uhidNo: pat.mrn || 'LL/7209/MAY-2026'
    }));
    setPatientSearch(pat.name);
    setShowPatientList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName) {
      toast.error('Please specify or select a Patient Name');
      return;
    }
    if (!formData.signatureData && !formData.patientName) {
      toast.error('Patient or Guardian Signature is required.');
      return;
    }

    const nowFormatted = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newConsent: OTConsent = {
      id: `ct-${Date.now()}`,
      patientId: formData.patientId || `p-${Date.now()}`,
      type: formData.type,
      terms: formData.terms,
      patientName: formData.patientName,
      guardianName: formData.relativeName ? `${formData.relativeName} (${formData.relativeRelation})` : formData.guardianName,
      witnessName: formData.witnessName || formData.doctorName || 'Dr. Navodita Tiwari',
      signedAt: new Date().toISOString(),
      signatureType: 'Digital',
      signatureData: formData.signatureData || formData.patientName,
      status: formData.status,
      uhidNo: formData.uhidNo || 'LL/7209/MAY-2026',
      regNo: formData.regNo || 'LL/7209/MAY-2026',
      procedureName: formData.procedureName,
      doctorName: formData.doctorName,
      doctorSign: formData.doctorSign || formData.doctorName,
      doctorSignedAt: nowFormatted,
      relativeName: formData.relativeName,
      relativeRelation: formData.relativeRelation,
      relativeSign: formData.relativeSign || formData.relativeName,
      relativeSignedAt: nowFormatted,
      patientSign: formData.signatureData || formData.patientName,
      patientSignedAt: nowFormatted,
      selectedAnaesthesiaTypes: { ...anaesthesiaOptions }
    };

    const saved = await supabaseService.createOTConsent(newConsent);
    if (saved) {
      setConsents(prev => [newConsent, ...prev]);
      toast.success('Consent form created and archived successfully!');
      setIsAddOpen(false);
    } else {
      toast.error('Failed to archive consent');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to revoke/delete this consent form record?')) {
      const success = await supabaseService.deleteOTConsent(id);
      if (success) {
        setConsents(prev => prev.filter(c => c.id !== id));
        toast.success('Consent record deleted');
      } else {
        toast.error('Failed to delete consent record');
      }
    }
  };

  const handlePrint = (consent: OTConsent, printBlank = false, printLanguage: 'English' | 'Hindi' | 'Bilingual' = 'English') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Failed to open print layout. Please disable popup blockers.');
      return;
    }

    const isAnaesthesia = consent.type === 'Anaesthesia';
    const patientName = printBlank ? '..........................................................' : (consent.patientName || 'PRIYANKA PARTE');
    const procedureName = printBlank ? '....................................................................................................' : (consent.procedureName || 'ETEP RE for ventral hernia c_ di varicath repair');
    const regNo = consent.regNo || 'LL/7209/MAY-2026';
    const uhidNo = printBlank ? '........................' : (consent.uhidNo || 'LL/7209/MAY-2026');
    const doctorName = printBlank ? '........................' : (consent.doctorName || consent.witnessName || 'Dr. Navodita Tiwari');
    const relativeName = printBlank ? '................................' : (consent.relativeName || 'PRSHAILENDRA SINGH');
    const relativeRelation = printBlank ? '................' : (consent.relativeRelation || 'HUSBAND');
    const dateStr = printBlank ? '17 / 7 / 26' : (consent.signedAt ? new Date(consent.signedAt).toLocaleDateString('en-GB') : '17/07/2026');

    // Get selected options
    const sel = consent.selectedAnaesthesiaTypes || { general: true };

    const checkMark = (checked: boolean) => `
      <div style="width:14px; height:14px; border:1.5px solid #000; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px; font-family:sans-serif;">
        ${checked && !printBlank ? '✓' : '&nbsp;'}
      </div>
    `;

    // Titles
    let docTitle = 'Consent For Anaesthesia Services';
    if (isAnaesthesia) {
      if (printLanguage === 'Hindi') docTitle = 'एनेस्थीसिया (बेहोशी/सुन्न करने) सेवाओं हेतु सहमति पत्र';
      else if (printLanguage === 'Bilingual') docTitle = 'Consent For Anaesthesia Services / एनेस्थीसिया सहमति पत्र';
    } else {
      const engTitle = CONSENT_TEMPLATES[consent.type]?.title || `${consent.type} Consent`;
      const hindiTitle = CONSENT_TEMPLATES_HINDI[consent.type]?.title || `${consent.type} सहमति पत्र`;
      if (printLanguage === 'Hindi') docTitle = hindiTitle;
      else if (printLanguage === 'Bilingual') docTitle = `${engTitle} / ${hindiTitle}`;
      else docTitle = engTitle;
    }

    // Modal Table Items for Anaesthesia - Only include checked/ticked items in printout if not printing a blank form
    const activeModalities = ANAESTHESIA_MODALITIES_TABLE.filter(item => {
      if (printBlank) return true;
      let isChecked = false;
      if (item.id === 'general') isChecked = !!sel.general;
      if (item.id === 'spinalEpidural') isChecked = !!sel.spinalEpidural || !!sel.spinalEpiduralWithSedation;
      if (item.id === 'nerveBlock') isChecked = !!sel.nerveBlock || !!sel.nerveBlockWithSedation;
      if (item.id === 'totalIntravenous' || item.id === 'regional') isChecked = !!(sel as any).totalIntravenous || !!sel.regional || !!sel.regionalWithSedation;
      if (item.id === 'macWithSedation') isChecked = !!sel.macWithSedation;
      if (item.id === 'macWithoutSedation') isChecked = !!sel.macWithoutSedation;
      return isChecked;
    });

    const modalitiesToRender = (activeModalities.length > 0 || printBlank) ? activeModalities : ANAESTHESIA_MODALITIES_TABLE;

    const tableItems = modalitiesToRender.map(item => {
      let isChecked = false;
      if (item.id === 'general') isChecked = !!sel.general;
      if (item.id === 'spinalEpidural') isChecked = !!sel.spinalEpidural || !!sel.spinalEpiduralWithSedation;
      if (item.id === 'nerveBlock') isChecked = !!sel.nerveBlock || !!sel.nerveBlockWithSedation;
      if (item.id === 'totalIntravenous' || item.id === 'regional') isChecked = !!(sel as any).totalIntravenous || !!sel.regional || !!sel.regionalWithSedation;
      if (item.id === 'macWithSedation') isChecked = !!sel.macWithSedation;
      if (item.id === 'macWithoutSedation') isChecked = !!sel.macWithoutSedation;

      let nameDisplay = item.name;
      let expDisplay = item.expectedResult;
      let techDisplay = item.technique;
      let riskDisplay = item.risks;

      if (printLanguage === 'Hindi') {
        nameDisplay = item.nameHindi;
        expDisplay = item.expectedResultHindi;
        techDisplay = item.techniqueHindi;
        riskDisplay = item.risksHindi;
      } else if (printLanguage === 'Bilingual') {
        nameDisplay = `<div style="font-weight:900; color:#000000; font-size:9pt;">${item.name}</div><div style="font-size:8.5pt; color:#000000; font-weight:800; margin-top:1px;">${item.nameHindi}</div>`;
        expDisplay = `<div style="font-weight:800; color:#000000;">${item.expectedResult}</div><div style="font-size:8pt; color:#000000; font-weight:700; margin-top:1px;">${item.expectedResultHindi}</div>`;
        techDisplay = `<div style="font-weight:800; color:#000000;">${item.technique}</div><div style="font-size:8pt; color:#000000; font-weight:700; margin-top:1px;">${item.techniqueHindi}</div>`;
        riskDisplay = `<div style="font-weight:800; color:#000000;">${item.risks}</div><div style="font-size:8pt; color:#000000; font-weight:700; margin-top:1px;">${item.risksHindi}</div>`;
      }

      const subOpt = item.subOption ? (printLanguage === 'Hindi' ? item.subOptionHindi : item.subOption) : '';

      return `
        <tr style="page-break-inside: avoid;">
          <td class="col-modality" style="padding: 6px 7px; vertical-align: top; border: 1.5px solid #000000;">
            <div style="display:flex; align-items:flex-start; gap:6px;">
              ${checkMark(isChecked)}
              <div>
                <div style="font-size:9.5pt; font-weight:900; color:#000000; line-height:1.2;">${nameDisplay}</div>
                ${subOpt ? `<div style="font-size:8.5pt; color:#000000; font-weight:800; margin-top:2px;">${subOpt}</div>` : ''}
              </div>
            </div>
          </td>
          <td class="col-details" style="padding: 6px 7px; vertical-align: top; border: 1.5px solid #000000;">
            <div style="margin-bottom:4px;">
              <strong style="font-size:8.5pt; text-transform:uppercase; color:#000000; font-weight:900; display:block; margin-bottom:2px; letter-spacing:0.2px;">
                ${printLanguage === 'Hindi' ? 'अपेक्षित परिणाम' : (printLanguage === 'Bilingual' ? 'Expected Result / अपेक्षित परिणाम' : 'Expected Result')}
              </strong>
              <div style="font-size:8.5pt; color:#000000; font-weight:800; line-height:1.35;">${expDisplay}</div>
            </div>
            <div>
              <strong style="font-size:8.5pt; text-transform:uppercase; color:#000000; font-weight:900; display:block; margin-bottom:2px; letter-spacing:0.2px;">
                ${printLanguage === 'Hindi' ? 'तकनीक' : (printLanguage === 'Bilingual' ? 'Technique / तकनीक' : 'Technique')}
              </strong>
              <div style="font-size:8.5pt; color:#000000; font-weight:800; line-height:1.35;">${techDisplay}</div>
            </div>
          </td>
          <td class="col-risks" style="padding: 6px 7px; vertical-align: top; border: 1.5px solid #000000;">
            <strong style="font-size:8.5pt; text-transform:uppercase; color:#000000; font-weight:900; display:block; margin-bottom:2px; letter-spacing:0.2px;">
              ${printLanguage === 'Hindi' ? 'जोखिम (जैसे:)' : (printLanguage === 'Bilingual' ? 'Risks / जोखिम' : 'Risks & Complications')}
            </strong>
            <div style="font-size:8.5pt; color:#000000; font-weight:800; line-height:1.35;">${riskDisplay}</div>
          </td>
        </tr>
      `;
    }).join('');

    // Preambles & Declarations
    let preambleHtml = '';
    let declarationHtml = '';

    if (isAnaesthesia) {
      if (printLanguage === 'Hindi') {
        preambleHtml = `मैं, <span class="underline-text">${patientName}</span>, शल्य क्रिया/ऑपरेशन <span class="underline-text">${procedureName}</span> हेतु निर्धारित हूँ। ${ANAESTHESIA_PREAMBLE_HINDI}`;
        declarationHtml = ANAESTHESIA_DECLARATION_HINDI;
      } else if (printLanguage === 'Bilingual') {
        preambleHtml = `
          <div style="margin-bottom:6px; line-height:1.4; color:#000000; font-weight:700;">I, <span class="underline-text">${patientName}</span>, have been scheduled for <span class="underline-text">${procedureName}</span> surgery. ${ANAESTHESIA_PREAMBLE}</div>
          <div style="border-top:1px dashed #000000; padding-top:6px; margin-top:6px; line-height:1.4; color:#000000; font-weight:700;">मैं, <span class="underline-text">${patientName}</span>, शल्य क्रिया <span class="underline-text">${procedureName}</span> हेतु निर्धारित हूँ। ${ANAESTHESIA_PREAMBLE_HINDI}</div>
        `;
        declarationHtml = `
          <div style="margin-bottom:4px; color:#000000; font-weight:700;">${ANAESTHESIA_DECLARATION}</div>
          <div style="border-top:1px dashed #000000; padding-top:4px; margin-top:4px; color:#000000; font-weight:700;">${ANAESTHESIA_DECLARATION_HINDI}</div>
        `;
      } else {
        preambleHtml = `I, <span class="underline-text">${patientName}</span>, have been scheduled for <span class="underline-text">${procedureName}</span> surgery. ${ANAESTHESIA_PREAMBLE}`;
        declarationHtml = ANAESTHESIA_DECLARATION;
      }
    } else {
      // General, Surgery, Blood Transfusion, ICU, High-risk
      const engTerms = consent.terms || CONSENT_TEMPLATES[consent.type]?.text || '';
      const hindiTerms = CONSENT_TEMPLATES_HINDI[consent.type]?.text || '';

      if (printLanguage === 'Hindi') {
        preambleHtml = `<div style="white-space: pre-line; line-height:1.4; color:#000000; font-weight:700;">${hindiTerms}</div>`;
      } else if (printLanguage === 'Bilingual') {
        preambleHtml = `
          <div style="white-space: pre-line; line-height:1.4; margin-bottom:8px; color:#000000; font-weight:700;">${engTerms}</div>
          <div style="border-top:1px dashed #000000; padding-top:8px; white-space: pre-line; line-height:1.4; color:#000000; font-weight:700;">${hindiTerms}</div>
        `;
      } else {
        preambleHtml = `<div style="white-space: pre-line; line-height:1.4; color:#000000; font-weight:700;">${engTerms}</div>`;
      }
    }

    // Signatures Titles
    const doctorTitle = printLanguage === 'Hindi' ? 'चिकित्सक (Doctor)' : (printLanguage === 'Bilingual' ? 'Doctor / चिकित्सक' : 'Doctor');
    const relativeTitle = printLanguage === 'Hindi' ? 'रोगी के रिश्तेदार/संरक्षक' : (printLanguage === 'Bilingual' ? 'Patient Relative / रिश्तेदार' : 'Relative');
    const patientTitle = printLanguage === 'Hindi' ? 'रोगी (Patient)' : (printLanguage === 'Bilingual' ? 'Patient / रोगी' : 'Patient');
    const nameLabel = printLanguage === 'Hindi' ? 'नाम:' : 'Name:';
    const signLabel = printLanguage === 'Hindi' ? 'हस्ताक्षर:' : 'Sign:';
    const relationLabel = printLanguage === 'Hindi' ? 'संबंध:' : 'Relation:';
    const dateLabel = printLanguage === 'Hindi' ? 'दिनांक:' : 'Date:';
    const timeLabel = printLanguage === 'Hindi' ? 'समय:' : 'Time:';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle} - ${printBlank ? 'Blank Form' : consent.patientName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800;900&family=Tiro+Devanagari+Hindi:ital@0;1&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 8mm 10mm 8mm 10mm; }
            * { 
              box-sizing: border-box; 
              -webkit-font-smoothing: antialiased !important; 
              -moz-osx-font-smoothing: grayscale !important; 
              text-rendering: optimizeLegibility !important; 
            }
            body { 
              font-family: 'Noto Sans Devanagari', 'Tiro Devanagari Hindi', -apple-system, BlinkMacSystemFont, Arial, sans-serif; 
              color: #000000 !important; 
              background: #ffffff !important; 
              line-height: 1.4; 
              font-size: 8.5pt; 
              font-weight: 600;
              padding: 0;
              margin: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .page-container {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 6px;
              border-bottom: 2.5px solid #000000;
              padding-bottom: 4px;
            }
            .hospital-title {
              font-size: 16pt;
              font-weight: 900;
              color: #000000 !important;
              margin: 0;
              font-family: Arial, sans-serif;
              letter-spacing: -0.2px;
              text-transform: uppercase;
            }
            .hospital-sub {
              font-size: 8.5pt;
              color: #000000 !important;
              margin: 1px 0 0 0;
              font-weight: 800;
            }
            .doc-title-banner {
              text-align: center;
              background: #f1f5f9 !important;
              border: 1.5px solid #000000;
              padding: 5px 10px;
              margin-bottom: 8px;
              border-radius: 3px;
            }
            .doc-title-banner h1 {
              font-size: 12pt;
              font-weight: 900;
              margin: 0;
              color: #000000 !important;
              text-transform: uppercase;
              letter-spacing: 0.2px;
              line-height: 1.3;
            }
            .patient-card {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
              font-size: 8.5pt;
              border: 1.5px solid #000000;
            }
            .patient-card td {
              padding: 4px 7px;
              border: 1px solid #000000;
              vertical-align: middle;
              color: #000000 !important;
              font-weight: 700;
            }
            .patient-card .lbl {
              font-weight: 900;
              color: #000000 !important;
              background: #f1f5f9 !important;
              white-space: nowrap;
              width: 15%;
            }
            .patient-card .val {
              font-weight: 900;
              color: #000000 !important;
            }
            .underline-text {
              border-bottom: 1.5px solid #000000;
              padding: 0 4px;
              font-weight: 900;
              display: inline-block;
              color: #000000 !important;
            }
            .preamble {
              text-align: justify;
              font-size: 8.5pt;
              line-height: 1.4;
              margin-bottom: 8px;
              color: #000000 !important;
              font-weight: 800;
            }
            .consent-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 8px;
              font-size: 8.5pt;
            }
            .consent-table th {
              background: #f1f5f9 !important;
              color: #000000 !important;
              font-weight: 900;
              text-transform: uppercase;
              font-size: 8.5pt;
              padding: 6px;
              border: 1.5px solid #000000;
              letter-spacing: 0.2px;
            }
            .consent-table td {
              border: 1.5px solid #000000;
              color: #000000 !important;
              font-weight: 800;
            }
            .declaration-text {
              font-size: 8.5pt;
              text-align: justify;
              line-height: 1.4;
              margin-bottom: 8px;
              padding: 6px 8px;
              background: #fafafa !important;
              border: 1.5px solid #000000;
              border-radius: 3px;
              color: #000000 !important;
              font-weight: 800;
            }
            .sig-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 8.5pt;
              page-break-inside: avoid;
            }
            .sig-table td {
              border: 1.5px solid #000000;
              padding: 6px 8px;
              vertical-align: top;
              background: #fff !important;
              color: #000000 !important;
              font-weight: 800;
            }
            .sig-title {
              font-weight: 900;
              font-size: 9pt;
              text-align: center;
              margin-bottom: 6px;
              border-bottom: 1.5px solid #000000;
              padding-bottom: 3px;
              color: #000000 !important;
              text-transform: uppercase;
              background: #f1f5f9 !important;
            }
            @media print {
              * {
                color: #000000 !important;
                border-color: #000000 !important;
                box-shadow: none !important;
                text-shadow: none !important;
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body { 
                background: #ffffff !important;
                color: #000000 !important;
                font-size: 8.5pt !important; 
                font-weight: 600 !important;
              }
              p, div, span, td, th, strong, h1, h2, h3, h4, h5, h6 {
                color: #000000 !important;
              }
              .page-container { width: 100%; }
              .doc-title-banner, .patient-card .lbl, .consent-table th, .sig-title, .sig-table th {
                background-color: #f1f5f9 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <table class="header-table">
              <tr>
                <td style="width: 72%; vertical-align: top;">
                  <h1 class="hospital-title">GASTRO PLUS HOSPITAL</h1>
                  <p class="hospital-sub">Plot No. 7 & 8, Om Shiv Nagar, Gufa Mandir Road, Lal Ghati Bhopal, 462030, Madhya Pradesh &bull; Ph: 9109102145/9109101246</p>
                  <p class="hospital-sub" style="font-weight: 800; text-transform: uppercase; margin-top: 2px;">Department of Anaesthesiology & Surgical Care</p>
                </td>
                <td style="width: 28%; text-align: right; vertical-align: top;">
                  <div style="border: 1.5px solid #000000; padding: 4px 8px; border-radius: 3px; display: inline-block; text-align: right; background: #f1f5f9;">
                    <div style="font-size: 7.5pt; color: #000000; font-weight: 800; text-transform: uppercase;">Reg / Ref No.</div>
                    <div style="font-size: 10pt; font-weight: 900; color: #000000;">${regNo}</div>
                  </div>
                </td>
              </tr>
            </table>

            <div class="doc-title-banner">
              <h1>${docTitle}</h1>
            </div>

            <table class="patient-card">
              <tr>
                <td class="lbl">${printLanguage === 'Hindi' ? 'यूएचआईडी (UHID):' : 'UHID No.:'}</td>
                <td class="val">${uhidNo}</td>
                <td class="lbl">${printLanguage === 'Hindi' ? 'रोगी का नाम:' : 'Patient Name:'}</td>
                <td class="val" style="text-transform: uppercase;">${patientName}</td>
                <td class="lbl">${printLanguage === 'Hindi' ? 'दिनांक:' : 'Date:'}</td>
                <td class="val">${dateStr}</td>
              </tr>
              <tr>
                <td class="lbl">${printLanguage === 'Hindi' ? 'प्रक्रिया / ऑपरेशन:' : 'Procedure:'}</td>
                <td class="val" colspan="3">${procedureName}</td>
                <td class="lbl">${printLanguage === 'Hindi' ? 'चिकित्सक:' : 'Doctor:'}</td>
                <td class="val">${doctorName}</td>
              </tr>
            </table>

            <div class="preamble">
              ${preambleHtml}
            </div>

            ${isAnaesthesia ? `
              <table class="consent-table">
                <thead>
                  <tr>
                    <th style="width:28%; text-align:left;">Anaesthesia Modality / प्रकार</th>
                    <th style="width:36%; text-align:left;">Expected Outcome & Technique / परिणाम व तकनीक</th>
                    <th style="width:36%; text-align:left;">Potential Risks & Complications / सम्भावित जोखिम</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableItems}
                </tbody>
              </table>

              ${declarationHtml ? `<div class="declaration-text">${declarationHtml}</div>` : ''}
            ` : ''}

            <table class="sig-table">
              <tr>
                <th style="width:25%; background:#f1f5f9; font-weight:900; font-size:8pt; padding:5px 4px; border:1.5px solid #000000; text-align:center;">
                  ${printLanguage === 'Hindi' ? 'मरीज' : (printLanguage === 'Bilingual' ? 'Patient / मरीज' : 'Patient')}
                </th>
                <th style="width:25%; background:#f1f5f9; font-weight:900; font-size:8pt; padding:5px 4px; border:1.5px solid #000000; text-align:center;">
                  ${printLanguage === 'Hindi' ? 'मरीज का प्रतिनिधि एवं रिश्ता' : (printLanguage === 'Bilingual' ? 'Patient Representative / प्रतिनिधि' : 'Patient Representative')}
                </th>
                <th style="width:25%; background:#f1f5f9; font-weight:900; font-size:8pt; padding:5px 4px; border:1.5px solid #000000; text-align:center;">
                  ${printLanguage === 'Hindi' ? 'गवाह' : (printLanguage === 'Bilingual' ? 'Witness / गवाह' : 'Witness')}
                </th>
                <th style="width:25%; background:#f1f5f9; font-weight:900; font-size:8pt; padding:5px 4px; border:1.5px solid #000000; text-align:center;">
                  ${printLanguage === 'Hindi' ? 'डॉक्टर' : (printLanguage === 'Bilingual' ? 'Doctor / डॉक्टर' : 'Doctor')}
                </th>
              </tr>
              <tr>
                <td style="border:1.5px solid #000000; padding:6px; vertical-align:top; color:#000000 !important; font-weight:800;">
                  <div style="font-size:7.5pt; font-weight:800; color:#000000 !important; margin-bottom:2px;">
                    ${printLanguage === 'Hindi' ? 'दस्तखत / अंगूठे का निशान:' : (printLanguage === 'Bilingual' ? 'Signature / Thumb / दस्तखत/अंगूठा:' : 'Signature / Thumb:')}
                  </div>
                  <div style="height:28px; display:flex; align-items:flex-end; border-bottom:1.5px dashed #000000; margin-bottom:4px; font-weight:900; font-size:9.5pt; color:#000000 !important;">
                    ${printBlank ? '' : (consent.patientSign || consent.signatureData || patientName)}
                  </div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${nameLabel}</strong> ${patientName}</div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${dateLabel}</strong> ${dateStr}</div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${timeLabel}</strong> ${printBlank ? '............' : '08:30 AM'}</div>
                </td>
                <td style="border:1.5px solid #000000; padding:6px; vertical-align:top; color:#000000 !important; font-weight:800;">
                  <div style="font-size:7.5pt; font-weight:800; color:#000000 !important; margin-bottom:2px;">
                    ${printLanguage === 'Hindi' ? 'दस्तखत / अंगूठे का निशान:' : (printLanguage === 'Bilingual' ? 'Signature / Thumb / दस्तखत/अंगूठा:' : 'Signature / Thumb:')}
                  </div>
                  <div style="height:28px; display:flex; align-items:flex-end; border-bottom:1.5px dashed #000000; margin-bottom:4px; font-weight:900; font-size:9.5pt; color:#000000 !important;">
                    ${printBlank ? '' : (consent.relativeSign || relativeName)}
                  </div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${nameLabel}</strong> ${relativeName}</div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${relationLabel}</strong> ${relativeRelation}</div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${dateLabel}</strong> ${dateStr}</div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${timeLabel}</strong> ${printBlank ? '............' : '08:30 AM'}</div>
                </td>
                <td style="border:1.5px solid #000000; padding:6px; vertical-align:top; color:#000000 !important; font-weight:800;">
                  <div style="font-size:7.5pt; font-weight:800; color:#000000 !important; margin-bottom:2px;">
                    ${printLanguage === 'Hindi' ? 'दस्तखत:' : (printLanguage === 'Bilingual' ? 'Signature / दस्तखत:' : 'Signature:')}
                  </div>
                  <div style="height:28px; display:flex; align-items:flex-end; border-bottom:1.5px dashed #000000; margin-bottom:4px; font-weight:900; font-size:9.5pt; color:#000000 !important;">
                    ${printBlank ? '' : (consent.witnessName || 'Nurse Deepika Roy')}
                  </div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${nameLabel}</strong> ${consent.witnessName || 'Nurse Deepika Roy'}</div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${dateLabel}</strong> ${dateStr}</div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${timeLabel}</strong> ${printBlank ? '............' : '08:30 AM'}</div>
                </td>
                <td style="border:1.5px solid #000000; padding:6px; vertical-align:top; color:#000000 !important; font-weight:800;">
                  <div style="font-size:7.5pt; font-weight:800; color:#000000 !important; margin-bottom:2px;">
                    ${printLanguage === 'Hindi' ? 'डॉक्टर का दस्तखत:' : (printLanguage === 'Bilingual' ? 'Doctor Sign / डॉक्टर दस्तखत:' : 'Doctor Sign:')}
                  </div>
                  <div style="height:28px; display:flex; align-items:flex-end; border-bottom:1.5px dashed #000000; margin-bottom:4px; font-weight:900; font-size:9.5pt; color:#000000 !important;">
                    ${printBlank ? '' : (consent.doctorSign || doctorName)}
                  </div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${nameLabel}</strong> ${doctorName}</div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${dateLabel}</strong> ${dateStr}</div>
                  <div style="font-size:8.5pt; margin:2px 0; color:#000000 !important; font-weight:800;"><strong style="font-weight:900;">${timeLabel}</strong> ${printBlank ? '............' : '08:30 AM'}</div>
                </td>
              </tr>
            </table>

            <div style="text-align: right; font-size: 8pt; margin-top: 6px; color: #000000 !important; font-weight: 800;">
              Page 1 of 1 &bull; Ref: GP-CNS-${consent.type.toUpperCase()}-2026 (${printLanguage}) &bull; Neo Gastroplus Hospital
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
            window.onafterprint = function() { window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(printBlank ? `Blank ${consent.type} Consent template ready for printing (${printLanguage})` : 'Consent form printed successfully!');
  };

  const filteredConsents = consents.filter(c => {
    const matchesSearch = c.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.witnessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.procedureName && c.procedureName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'All' || c.type === selectedType;
    const matchesPatient = patientId ? c.patientId === patientId : true;
    return matchesSearch && matchesType && matchesPatient;
  });

  const consentTypes = ['All', 'Anaesthesia', 'General', 'Surgery', 'Minor Surgery', 'Blood Transfusion', 'ICU', 'High-risk'];

  return (
    <div className="space-y-6">
      {/* Top Banner highlighting Anaesthesia Consent */}
      <div className="flex flex-col md:flex-row gap-6 p-6 rounded-2xl border border-[#1A5E63]/25 bg-linear-to-r from-teal-50/60 via-slate-50 to-indigo-50/40 shadow-xs">
        <div className="p-4 rounded-xl bg-[#1A5E63] text-white shrink-0 self-start shadow-sm">
          <FileSignature className="w-8 h-8" />
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-[#1A5E63] text-lg">GastroPlus Operating Theatre Consent Management</h3>
            <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 uppercase">NABH & WHO Compliant</Badge>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
            Official Clinical Authorization & Anaesthesia Consent Forms (including General, Spinal/Epidural, Nerve Blocks & MAC). Supports digital signatures, relative/witness verifications, and offline blank physical printouts for GastroPlus Hospital.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button 
              size="sm" 
              onClick={() => handleOpenAdd('Anaesthesia', 'English')} 
              className="bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white font-bold text-xs h-8 px-3 gap-1.5 rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> New Anaesthesia Consent Form
            </Button>

            <Button 
              size="sm" 
              onClick={() => setIsGeneralConsentOpen(true)} 
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-8 px-3 gap-1.5 rounded-lg shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" /> General Consent Form
            </Button>
            <Button 
              size="sm" 
              onClick={() => setIsPoorPrognosisOpen(true)} 
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs h-8 px-3 gap-1.5 rounded-lg shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Poor Prognosis & High Risk Consent
            </Button>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 px-1 flex items-center gap-1">
                <Languages className="w-3 h-3 text-teal-700" /> Blank Sheet:
              </span>
              <Button 
                size="sm"
                variant="ghost" 
                onClick={() => {
                  const tempConsent: OTConsent = {
                    id: 'temp-blank',
                    patientId: '',
                    type: 'Anaesthesia',
                    terms: ANAESTHESIA_PREAMBLE,
                    patientName: '',
                    witnessName: 'Dr. Navodita Tiwari',
                    signedAt: new Date().toISOString(),
                    signatureType: 'Typed',
                    signatureData: '',
                    status: 'Draft',
                    uhidNo: 'LL/7209/MAY-2026',
                    regNo: 'LL/7209/MAY-2026'
                  };
                  handlePrint(tempConsent, true, 'English');
                }}
                className="text-xs font-bold h-6 px-2 hover:bg-white text-slate-800"
              >
                English
              </Button>
              <Button 
                size="sm"
                variant="ghost" 
                onClick={() => {
                  const tempConsent: OTConsent = {
                    id: 'temp-blank',
                    patientId: '',
                    type: 'Anaesthesia',
                    terms: ANAESTHESIA_PREAMBLE_HINDI,
                    patientName: '',
                    witnessName: 'Dr. Navodita Tiwari',
                    signedAt: new Date().toISOString(),
                    signatureType: 'Typed',
                    signatureData: '',
                    status: 'Draft',
                    uhidNo: 'LL/7209/MAY-2026',
                    regNo: 'LL/7209/MAY-2026'
                  };
                  handlePrint(tempConsent, true, 'Hindi');
                }}
                className="text-xs font-bold h-6 px-2 hover:bg-white text-teal-900 bg-teal-50/80"
              >
                हिंदी Font
              </Button>
              <Button 
                size="sm"
                variant="ghost" 
                onClick={() => {
                  const tempConsent: OTConsent = {
                    id: 'temp-blank',
                    patientId: '',
                    type: 'Anaesthesia',
                    terms: ANAESTHESIA_PREAMBLE,
                    patientName: '',
                    witnessName: 'Dr. Navodita Tiwari',
                    signedAt: new Date().toISOString(),
                    signatureType: 'Typed',
                    signatureData: '',
                    status: 'Draft',
                    uhidNo: 'LL/7209/MAY-2026',
                    regNo: 'LL/7209/MAY-2026'
                  };
                  handlePrint(tempConsent, true, 'Bilingual');
                }}
                className="text-xs font-bold h-6 px-2 hover:bg-white text-indigo-900 bg-indigo-50/80"
              >
                द्विभाषी
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-navigation tabs: Surgery Consent Form vs Anaesthesia Consent vs Record Sheet */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveSubTab('surgeryForm')}
          className={`pb-3 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'surgeryForm'
              ? 'border-[#1A5E63] text-[#1A5E63] bg-teal-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSignature className="w-4 h-4 text-amber-600" />
          Surgery Consent Form (GastroPlus - English & Hindi)
        </button>

        <button
          onClick={() => setActiveSubTab('consents')}
          className={`pb-3 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'consents'
              ? 'border-[#1A5E63] text-[#1A5E63] bg-teal-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-teal-600" />
          Consent For Anaesthesia Services & Procedure Forms
        </button>

        <button
          onClick={() => setActiveSubTab('recordSheet')}
          className={`pb-3 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'recordSheet'
              ? 'border-[#1A5E63] text-[#1A5E63] bg-teal-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-indigo-600" />
          Anaesthesia Record Sheet (GastroPlus Log)
        </button>

        <button
          onClick={() => setActiveSubTab('anaestheticOpRecord')}
          className={`pb-3 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'anaestheticOpRecord'
              ? 'border-[#1A5E63] text-[#1A5E63] bg-[#1A5E63]/10 text-[#1A5E63] rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-amber-600" />
          Anaesthetic Operation Record Form (Neo Gastro Standard)
        </button>

        <button
          type="button"
          onClick={() => setIsPoorPrognosisOpen(true)}
          className="pb-3 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 border-transparent text-rose-800 bg-rose-50/80 hover:bg-rose-100 rounded-t-xl transition-all cursor-pointer shadow-xs"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          Poor Prognosis Consent Form
        </button>

        <button
          type="button"
          onClick={() => setIsPostOpAnaesthesiaModalOpen(true)}
          className="pb-3 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 border-transparent text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100 rounded-t-xl transition-all cursor-pointer ml-auto shadow-xs"
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          Post operative Anaesthesia Instructions
        </button>
      </div>

      {activeSubTab === 'surgeryForm' ? (
        <SurgeryConsentForm />
      ) : activeSubTab === 'recordSheet' ? (
        <AnaesthesiaRecordSheet />
      ) : activeSubTab === 'anaestheticOpRecord' ? (
        <AnaestheticOperationRecord />
      ) : (
      /* Main Content Layout */
      <div className="space-y-6 w-full">
        {/* Hospital Consent Templates - Wide Full-Width Grid */}
        <Card className="border border-teal-200/80 shadow-xs rounded-2xl overflow-hidden bg-gradient-to-r from-teal-50/40 via-white to-slate-50/40">
          <CardHeader className="pb-3 border-b border-teal-100/80 bg-teal-900/5 px-5 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#1A5E63]" />
                  Hospital Consent Templates (Neo Gastroplus Hospital)
                </CardTitle>
                <CardDescription className="text-xs text-slate-600 mt-0.5">
                  Select any pre-configured template in English or Hindi font to view, fill, or print blank forms.
                </CardDescription>
              </div>

              {/* Language Switcher Pills for Templates */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-teal-200 shadow-2xs">
                <span className="text-[11px] font-extrabold text-teal-900 px-2 flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5 text-teal-700" /> Template Language:
                </span>
                <button
                  type="button"
                  onClick={() => setTemplateLanguage('English')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    templateLanguage === 'English'
                      ? 'bg-[#1A5E63] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateLanguage('Hindi')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    templateLanguage === 'Hindi'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  हिंदी (Hindi)
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateLanguage('Bilingual')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    templateLanguage === 'Bilingual'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  द्विभाषी (Bilingual)
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(CONSENT_TEMPLATES).map(([key, item]) => {
                const isHindi = templateLanguage === 'Hindi';
                const isBilingual = templateLanguage === 'Bilingual';
                const hindiItem = CONSENT_TEMPLATES_HINDI[key as keyof typeof CONSENT_TEMPLATES_HINDI];

                const cardTitle = isHindi 
                  ? (hindiItem?.title || item.title)
                  : isBilingual 
                  ? `${item.title} / ${hindiItem?.title || ''}`
                  : item.title;

                return (
                  <div 
                    key={key} 
                    className="p-4 border border-slate-200/90 rounded-2xl hover:border-teal-400 hover:shadow-md bg-white flex flex-col justify-between group transition-all"
                  >
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          {key} Consent
                        </span>
                        <Badge variant="outline" className="text-[10px] border-teal-300 text-teal-800 bg-teal-50">
                          {templateLanguage}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-700 font-bold leading-snug">
                        {cardTitle}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenAdd(key as any, templateLanguage)}
                        className="w-full text-xs font-bold h-8 bg-teal-50 text-[#1A5E63] hover:bg-[#1A5E63] hover:text-white border border-teal-200/60 transition-colors"
                      >
                        Fill Form ({templateLanguage})
                      </Button>

                      <div className="flex gap-1">
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const tempConsent: OTConsent = {
                              id: 'blank-' + Date.now(),
                              patientId: '',
                              patientName: '',
                              procedureName: '',
                              type: key as any,
                              terms: '',
                              witnessName: 'Dr. Navodita Tiwari',
                              signatureType: 'Typed',
                              signatureData: '',
                              signedAt: new Date().toISOString(),
                              doctorName: 'Dr. Navodita Tiwari',
                              status: 'Signed',
                              uhidNo: 'LL/7209/MAY-2026',
                              regNo: 'LL/7209/MAY-2026'
                            };
                            handlePrint(tempConsent, true, 'English');
                          }}
                          className="flex-1 text-[10px] h-6 px-1 text-slate-600 hover:bg-slate-100 font-semibold"
                        >
                          Print Eng
                        </Button>
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const tempConsent: OTConsent = {
                              id: 'blank-' + Date.now(),
                              patientId: '',
                              patientName: '',
                              procedureName: '',
                              type: key as any,
                              terms: '',
                              witnessName: 'Dr. Navodita Tiwari',
                              signatureType: 'Typed',
                              signatureData: '',
                              signedAt: new Date().toISOString(),
                              doctorName: 'Dr. Navodita Tiwari',
                              status: 'Signed',
                              uhidNo: 'LL/7209/MAY-2026',
                              regNo: 'LL/7209/MAY-2026'
                            };
                            handlePrint(tempConsent, true, 'Hindi');
                          }}
                          className="flex-1 text-[10px] h-6 px-1 text-teal-800 hover:bg-teal-50 font-bold"
                        >
                          Print हिंदी
                        </Button>
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const tempConsent: OTConsent = {
                              id: 'blank-' + Date.now(),
                              patientId: '',
                              patientName: '',
                              procedureName: '',
                              type: key as any,
                              terms: '',
                              witnessName: 'Dr. Navodita Tiwari',
                              signatureType: 'Typed',
                              signatureData: '',
                              signedAt: new Date().toISOString(),
                              doctorName: 'Dr. Navodita Tiwari',
                              status: 'Signed',
                              uhidNo: 'LL/7209/MAY-2026',
                              regNo: 'LL/7209/MAY-2026'
                            };
                            handlePrint(tempConsent, true, 'Bilingual');
                          }}
                          className="flex-1 text-[10px] h-6 px-1 text-indigo-800 hover:bg-indigo-50 font-bold"
                        >
                          Print Both
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Featured Anaesthesia & Signed Consent Records Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* Left Block: Signed Consent Archives (8 Columns) */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="border shadow-xs rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Signed Consent Records & Authorizations</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Archived Anaesthesia, Surgery, ICU, and General procedure consents.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-[160px] h-9 text-xs font-semibold">
                        <SelectValue placeholder="Consent Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {consentTypes.map(t => <SelectItem key={t} value={t} className="text-xs">{t === 'All' ? 'All Form Types' : t + ' Consent'}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Search by patient name, procedure, or doctor..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-xs bg-slate-50/50 border-slate-200"
                  />
                </div>

                <div className="space-y-3">
                  {filteredConsents.length > 0 ? (
                    filteredConsents.map((consent) => (
                      <div 
                        key={consent.id} 
                        className={`p-4 rounded-xl border transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-xs ${
                          consent.type === 'Anaesthesia' ? 'border-teal-200 hover:border-teal-300' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-[10px] font-extrabold px-2 py-0.5 uppercase ${
                              consent.type === 'Anaesthesia' ? 'bg-teal-100 text-teal-800 border-teal-300' :
                              consent.type === 'High-risk' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              consent.type === 'ICU' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              'bg-slate-100 text-slate-800 border-slate-300'
                            }`}>
                              {consent.type} Consent
                            </Badge>

                            {consent.uhidNo && (
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                                UHID: {consent.uhidNo}
                              </span>
                            )}

                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(consent.signedAt).toLocaleDateString()} at {new Date(consent.signedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <h4 className="font-extrabold text-slate-900 text-base">{consent.patientName}</h4>
                            {consent.guardianName && (
                              <span className="text-xs text-slate-500 italic">Rel: {consent.guardianName}</span>
                            )}
                          </div>

                          {consent.procedureName && (
                            <p className="text-xs font-semibold text-teal-900 bg-teal-50/80 border border-teal-100/80 px-2.5 py-1 rounded-md inline-block">
                              Procedure: <strong>{consent.procedureName}</strong>
                            </p>
                          )}

                          <p className="text-[11px] text-slate-500">
                            Doctor: <strong className="text-slate-700">{consent.doctorName || consent.witnessName}</strong>
                            {consent.relativeName ? ` • Relative: ${consent.relativeName} (${consent.relativeRelation || 'Relative'})` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs font-bold gap-1 text-slate-700 border-slate-200"
                            onClick={() => setViewingConsent(consent)}
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            View Form
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 text-xs font-bold gap-1 bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white"
                            onClick={() => handlePrint(consent, false, 'English')}
                            title="Print in English"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print Eng
                          </Button>

                          <Button 
                            size="sm" 
                            className="h-8 text-xs font-bold gap-1 bg-teal-700 hover:bg-teal-800 text-white"
                            onClick={() => handlePrint(consent, false, 'Hindi')}
                            title="Print in Hindi Font"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            हिंदी
                          </Button>

                          <Button 
                            size="sm" 
                            className="h-8 text-xs font-bold gap-1 bg-indigo-700 hover:bg-indigo-800 text-white"
                            onClick={() => handlePrint(consent, false, 'Bilingual')}
                            title="Print Bilingual"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Both
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                            onClick={() => handleDelete(consent.id)}
                            title="Revoke / Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      No consent authorization records matched your search filter.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Block: Featured Anaesthesia Overview (4 Columns) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-2 border-teal-500/30 bg-linear-to-b from-teal-50/50 to-white shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="bg-teal-900 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-teal-300" />
                    <CardTitle className="text-sm font-black tracking-wide uppercase">Consent for Anaesthesia Services</CardTitle>
                  </div>
                  <Badge className="bg-teal-700 text-white text-[9px] font-bold">GASTROPLUS HOSPITAL</Badge>
                </div>
                <CardDescription className="text-teal-100 text-[11px] mt-1">
                  Official GastroPlus Hospital Anaesthesiology Services Consent Form
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5 text-xs">
                <div className="p-3 bg-white rounded-xl border border-teal-100 space-y-2">
                  <p className="font-extrabold text-slate-900 text-xs flex items-center justify-between">
                    <span>Sample Record: PRIYANKA PARTE</span>
                    <Badge variant="outline" className="text-[9px] border-teal-300 text-teal-800 bg-teal-50">GENERAL ANAESTHESIA</Badge>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <strong>Surgery:</strong> ETEP RE for ventral hernia c_ di varicath repair
                  </p>
                  <p className="text-[11px] text-slate-500">
                    <strong>Relative:</strong> PRSHAILENDRA SINGH (HUSBAND)
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        const priyankaConsent = consents.find(c => c.patientName.includes('PRIYANKA')) || INITIAL_CONSENTS[0];
                        setViewingConsent(priyankaConsent);
                      }}
                      className="flex-1 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-8"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Preview Form
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const priyankaConsent = consents.find(c => c.patientName.includes('PRIYANKA')) || INITIAL_CONSENTS[0];
                        handlePrint(priyankaConsent, false);
                      }}
                      className="border-teal-200 text-teal-900 font-bold text-xs h-8"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1 text-teal-700" /> Print
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Anaesthesia Modalities Covered:</p>
                  <ul className="space-y-1 text-[11px] text-slate-600 font-medium">
                    <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" /> General Anaesthesia (Intubation/Airway)</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Spinal / Epidural Analgesia</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Major / Minor Nerve Blocks</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Intravenous Regional Anaesthesia</li>
                    <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" /> Monitored Anaesthesia Care (MAC)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      )}

      {/* MODAL: CREATE / SIGN CONSENT FORM */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-5xl sm:max-w-6xl w-full max-h-[92vh] overflow-y-auto rounded-2xl border-none shadow-2xl p-6 bg-white text-slate-800">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#1A5E63] text-white">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-extrabold text-slate-900">
                    {formData.type === 'Anaesthesia' ? 'Consent For Anaesthesia Services' : `Informed ${formData.type} Consent Form`}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Neo Gastroplus Hospital • Reg. No. LL/7209/MAY-2026
                  </DialogDescription>
                </div>
              </div>

              {/* Form Language Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <span className="text-[11px] font-extrabold text-slate-600 px-2 flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5 text-teal-700" /> Form Language:
                </span>
                <button
                  type="button"
                  onClick={() => handleFormLanguageChange('English')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    formLanguage === 'English'
                      ? 'bg-[#1A5E63] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleFormLanguageChange('Hindi')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    formLanguage === 'Hindi'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  हिंदी Font
                </button>
                <button
                  type="button"
                  onClick={() => handleFormLanguageChange('Bilingual')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    formLanguage === 'Bilingual'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  Bilingual
                </button>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs font-medium text-slate-700">
            {/* Patient Search / Picker */}
            <div className="space-y-1 relative">
              <Label className="text-xs font-bold text-slate-800">Patient Name / Select Existing Patient *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Type patient full legal name (e.g. PRIYANKA PARTE)..."
                  value={patientSearch || formData.patientName}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setFormData({...formData, patientName: e.target.value});
                    setShowPatientList(true);
                  }}
                  onFocus={() => setShowPatientList(true)}
                  className="pl-9 h-9 text-xs bg-slate-50 font-semibold"
                />
              </div>

              {showPatientList && patientSearch && (
                <div className="absolute top-16 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 max-h-[160px] overflow-y-auto">
                  {patients
                    .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.mrn.toLowerCase().includes(patientSearch.toLowerCase()))
                    .map(p => (
                      <div 
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer transition-colors flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{p.name}</p>
                          <p className="text-[10px] text-slate-400">MRN/UHID: {p.mrn}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] uppercase">{p.registration_type || 'Patient'}</Badge>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-bold text-slate-800">UHID / MRN Number</Label>
                <Input 
                  placeholder="e.g. LL/7209/MAY-2026"
                  value={formData.uhidNo}
                  onChange={e => setFormData({...formData, uhidNo: e.target.value})}
                  className="h-9 text-xs bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-800">Scheduled Procedure / Surgery *</Label>
                <Input 
                  placeholder="e.g. ETEP RE for ventral hernia c_ di varicath repair"
                  value={formData.procedureName}
                  onChange={e => setFormData({...formData, procedureName: e.target.value})}
                  className="h-9 text-xs font-semibold bg-slate-50 border-teal-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-bold text-slate-800">Consent Category *</Label>
                <Select value={formData.type} onValueChange={(v) => handleTypeChange(v as any)}>
                  <SelectTrigger className="h-9 text-xs font-semibold">
                    <SelectValue placeholder="Consent Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {consentTypes.filter(t => t !== 'All').map(t => <SelectItem key={t} value={t} className="text-xs">{t} Consent</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-800">Attending Doctor / Anesthesiologist</Label>
                <Input 
                  placeholder="e.g. Dr. Navodita Tiwari"
                  value={formData.doctorName}
                  onChange={e => setFormData({...formData, doctorName: e.target.value})}
                  className="h-9 text-xs bg-slate-50"
                />
              </div>
            </div>

            {/* ANAESTHESIA CUSTOM MODALITIES SELECTOR */}
            {formData.type === 'Anaesthesia' ? (
              <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-4 space-y-3">
                <p className="font-black text-teal-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-teal-700" />
                  Select Anaesthesia Services Checked for Administering:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-teal-100 hover:border-teal-300">
                    <Checkbox 
                      checked={anaesthesiaOptions.general}
                      onCheckedChange={checked => setAnaesthesiaOptions({...anaesthesiaOptions, general: !!checked})}
                    />
                    <span className="font-bold text-slate-800">General Anaesthesia</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-teal-100 hover:border-teal-300">
                    <Checkbox 
                      checked={anaesthesiaOptions.spinalEpidural}
                      onCheckedChange={checked => setAnaesthesiaOptions({...anaesthesiaOptions, spinalEpidural: !!checked})}
                    />
                    <span className="font-bold text-slate-800">Spinal or Epidural Analgesia</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-teal-100 hover:border-teal-300">
                    <Checkbox 
                      checked={anaesthesiaOptions.nerveBlock}
                      onCheckedChange={checked => setAnaesthesiaOptions({...anaesthesiaOptions, nerveBlock: !!checked})}
                    />
                    <span className="font-bold text-slate-800">Major/Minor Nerve Block</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-teal-100 hover:border-teal-300">
                    <Checkbox 
                      checked={anaesthesiaOptions.regional}
                      onCheckedChange={checked => setAnaesthesiaOptions({...anaesthesiaOptions, regional: !!checked})}
                    />
                    <span className="font-bold text-slate-800">Intravenous Regional Anaesthesia</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-teal-100 hover:border-teal-300">
                    <Checkbox 
                      checked={anaesthesiaOptions.macWithSedation}
                      onCheckedChange={checked => setAnaesthesiaOptions({...anaesthesiaOptions, macWithSedation: !!checked})}
                    />
                    <span className="font-bold text-slate-800">Monitored Anaesthesia (with sedation)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 rounded-lg border border-teal-100 hover:border-teal-300">
                    <Checkbox 
                      checked={anaesthesiaOptions.macWithoutSedation}
                      onCheckedChange={checked => setAnaesthesiaOptions({...anaesthesiaOptions, macWithoutSedation: !!checked})}
                    />
                    <span className="font-bold text-slate-800">Monitored Anaesthesia Care</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="font-bold text-slate-800">Terms & Conditions</Label>
                <div className="p-3 bg-slate-50 border rounded-xl text-xs text-slate-600 whitespace-pre-line leading-relaxed max-h-[140px] overflow-y-auto">
                  {formData.terms}
                </div>
              </div>
            )}

            {/* Relative / Guardian Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <Label className="font-bold text-slate-800">Relative / Guardian Full Name</Label>
                <Input 
                  placeholder="e.g. PRSHAILENDRA SINGH" 
                  value={formData.relativeName}
                  onChange={e => setFormData({...formData, relativeName: e.target.value})}
                  className="h-9 text-xs bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-800">Relationship to Patient</Label>
                <Select value={formData.relativeRelation} onValueChange={(v) => setFormData({...formData, relativeRelation: v})}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Relation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HUSBAND" className="text-xs">HUSBAND</SelectItem>
                    <SelectItem value="WIFE" className="text-xs">WIFE</SelectItem>
                    <SelectItem value="MOTHER" className="text-xs">MOTHER</SelectItem>
                    <SelectItem value="FATHER" className="text-xs">FATHER</SelectItem>
                    <SelectItem value="SON" className="text-xs">SON</SelectItem>
                    <SelectItem value="DAUGHTER" className="text-xs">DAUGHTER</SelectItem>
                    <SelectItem value="GUARDIAN" className="text-xs">GUARDIAN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Digital Signatures Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <Label className="font-bold text-slate-800">Patient Digital Signature Mark *</Label>
                <Input 
                  placeholder="e.g. PRIYANKA PARTE" 
                  value={formData.signatureData}
                  onChange={e => setFormData({...formData, signatureData: e.target.value})}
                  className="h-9 text-xs font-serif italic bg-slate-50 border-teal-200 text-teal-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-800">Witness / Staff Nurse</Label>
                <Input 
                  placeholder="e.g. Nurse Deepika Roy" 
                  value={formData.witnessName}
                  onChange={e => setFormData({...formData, witnessName: e.target.value})}
                  className="h-9 text-xs bg-slate-50"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="text-xs h-9">Cancel</Button>
              <div className="flex items-center gap-2">
                <Button 
                  type="submit" 
                  className="bg-[#1A5E63] hover:bg-[#1A5E63]/90 text-white text-xs h-9 font-bold px-4"
                >
                  Save Consent Form
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: VIEW CONSENT DETAILS */}
      <Dialog open={!!viewingConsent} onOpenChange={() => setViewingConsent(null)}>
        <DialogContent className="max-w-5xl sm:max-w-6xl w-full max-h-[88vh] overflow-y-auto rounded-2xl border-none shadow-2xl p-6 bg-white text-slate-800">
          {viewingConsent && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-teal-100 text-teal-800 border-teal-300 text-[10px] uppercase font-bold py-0.5">
                      {viewingConsent.type} Consent
                    </Badge>
                    {viewingConsent.uhidNo && (
                      <span className="text-xs font-mono text-slate-500">Reg/UHID: {viewingConsent.uhidNo}</span>
                    )}
                  </div>
                  <DialogTitle className="text-base font-extrabold text-slate-900 mt-1">
                    {viewingConsent.type === 'Anaesthesia' ? 'Consent For Anaesthesia Services' : viewingConsent.type + ' Authorization'}
                  </DialogTitle>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button 
                    onClick={() => handlePrint(viewingConsent, false, 'English')} 
                    variant="outline"
                    className="border-slate-300 text-slate-800 hover:bg-slate-50 font-bold text-xs gap-1 h-8 px-2.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    Print English
                  </Button>

                  <Button 
                    onClick={() => handlePrint(viewingConsent, false, 'Hindi')} 
                    className="bg-teal-700 text-white hover:bg-teal-800 font-bold text-xs gap-1 h-8 px-2.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print हिंदी Font
                  </Button>

                  <Button 
                    onClick={() => handlePrint(viewingConsent, false, 'Bilingual')} 
                    className="bg-indigo-700 text-white hover:bg-indigo-800 font-bold text-xs gap-1 h-8 px-2.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Bilingual
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-3 text-xs text-slate-700">
                {/* Hospital Header */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <h3 className="font-extrabold text-slate-900">GastroPlus Hospital</h3>
                    <p className="text-[11px] text-slate-500">Neo GastroPlus Hospital (A unit of GP Healthcare)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-bold text-slate-700">Reg. No.: {viewingConsent.regNo || 'LL/7209/MAY-2026'}</p>
                    <p className="text-[10px] text-slate-400">Date: {new Date(viewingConsent.signedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-teal-50/40 border border-teal-100 rounded-xl">
                  <div>
                    <span className="text-[10px] text-teal-800 uppercase font-extrabold">Patient Name</span>
                    <p className="font-black text-slate-900 text-sm">{viewingConsent.patientName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-teal-800 uppercase font-extrabold">UHID Number</span>
                    <p className="font-bold text-slate-800">{viewingConsent.uhidNo || 'LL/7209/MAY-2026'}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-teal-800 uppercase font-extrabold">Scheduled Surgery</span>
                    <p className="font-extrabold text-teal-950">{viewingConsent.procedureName || 'ETEP RE for ventral hernia'}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Preamble & Terms</span>
                  <div className="p-3 bg-white border rounded-xl text-[11px] text-slate-700 leading-relaxed max-h-[160px] overflow-y-auto">
                    {viewingConsent.terms}
                  </div>
                </div>

                {/* 3-Column Signature Table View */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 border rounded-xl bg-slate-50">
                    <p className="font-bold text-xs text-slate-900 border-b pb-1 mb-2">Doctor</p>
                    <p><strong>Sign:</strong> <span className="font-serif italic">{viewingConsent.doctorSign || 'Dr. N. Tiwari'}</span></p>
                    <p><strong>Name:</strong> {viewingConsent.doctorName || viewingConsent.witnessName}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Date: {new Date(viewingConsent.signedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="p-3 border rounded-xl bg-slate-50">
                    <p className="font-bold text-xs text-slate-900 border-b pb-1 mb-2">Relative</p>
                    <p><strong>Sign:</strong> <span className="font-serif italic">{viewingConsent.relativeSign || 'P. Singh'}</span></p>
                    <p><strong>Name:</strong> {viewingConsent.relativeName || 'PRSHAILENDRA SINGH'}</p>
                    <p><strong>Relation:</strong> {viewingConsent.relativeRelation || 'HUSBAND'}</p>
                  </div>

                  <div className="p-3 border rounded-xl bg-slate-50">
                    <p className="font-bold text-xs text-slate-900 border-b pb-1 mb-2">Patient</p>
                    <p><strong>Sign:</strong> <span className="font-serif italic font-bold">{viewingConsent.signatureData}</span></p>
                    <p><strong>Name:</strong> {viewingConsent.patientName}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Date: {new Date(viewingConsent.signedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <DialogFooter className="pt-3 border-t flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button onClick={() => handlePrint(viewingConsent, false, 'English')} variant="outline" className="h-8 text-xs font-bold">Print English</Button>
                    <Button onClick={() => handlePrint(viewingConsent, false, 'Hindi')} className="h-8 text-xs font-bold bg-teal-700 text-white">Print हिंदी</Button>
                    <Button onClick={() => handlePrint(viewingConsent, false, 'Bilingual')} className="h-8 text-xs font-bold bg-indigo-700 text-white">Print Both</Button>
                  </div>
                  <Button onClick={() => setViewingConsent(null)} variant="ghost" className="h-8 text-xs font-bold text-slate-600">Close</Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Post Operative Anaesthesia Instructions Modal */}
      {isPostOpAnaesthesiaModalOpen && (
        <Dialog open={isPostOpAnaesthesiaModalOpen} onOpenChange={setIsPostOpAnaesthesiaModalOpen}>
          <DialogContent className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none sm:max-w-none rounded-none m-0 p-0 flex flex-col bg-slate-50 overflow-y-auto border-none shadow-none z-50">
            <PostOpForms 
              patient={{ id: formData.uhidNo, name: formData.patientName || 'PRIYANKA PARTE' }} 
              defaultFormTab="instructions" 
              onClose={() => setIsPostOpAnaesthesiaModalOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      )}

      {/* General Consent Modal */}
      <GeneralConsentModal
        isOpen={isGeneralConsentOpen}
        onClose={() => setIsGeneralConsentOpen(false)}
        patient={formData.patientId ? { id: formData.patientId, name: formData.patientName, mrn: formData.uhidNo } : undefined}
      />
      {/* Poor Prognosis Consent Modal */}
      <PoorPrognosisConsentModal
        isOpen={isPoorPrognosisOpen}
        onClose={() => setIsPoorPrognosisOpen(false)}
        patient={formData.patientId ? { id: formData.patientId, name: formData.patientName, mrn: formData.uhidNo } : undefined}
      />
    </div>
  );
}
