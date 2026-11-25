export const escapeHTML = (value='') => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function certificateEligibility(state, lessonIds, signedIn) {
 const completed=lessonIds.filter(id=>state?.progress?.completed?.[id]===true).length;
 const score=Number(state?.progress?.quizScore)||0;
 return {completed,total:lessonIds.length,score,lessonsDone:completed===lessonIds.length,quizDone:score>=70,assemblyDone:state?.progress?.assemblyChecked===true,signedIn:!!signedIn,eligible:!!signedIn&&completed===lessonIds.length&&score>=70&&state?.progress?.assemblyChecked===true};
}
