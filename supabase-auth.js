(function(global){
  "use strict";
  var page=(location.pathname.split("/").pop()||"").toLowerCase();
  if(!document.querySelector('link[href*="platform-polish.css"]')){var polish=document.createElement("link");polish.rel="stylesheet";polish.href="platform-polish.css?v=3";document.head.appendChild(polish);}
  if(page==="login.html")document.body.classList.add("ci-login-page");
  if(page==="dashboard.html"||page==="kunde.html")document.body.classList.add("ci-advisor-app");
  if(page==="login.html"||page==="dashboard.html"||page==="kunde.html")document.querySelectorAll('.brand').forEach(function(el){el.classList.add('ci-brand');el.innerHTML='<span class="ci-brand-mark" aria-hidden="true">C</span><span class="ci-brand-type"><b>comb</b><b>invest</b></span>';});
  var config=global.CombinvestSupabaseConfig;
  if(!config||!global.supabase)throw new Error("Supabase-Client konnte nicht initialisiert werden.");
  var client=global.supabase.createClient(config.url,config.publishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });

  async function signIn(email,password){
    var result=await client.auth.signInWithPassword({email:String(email||"").trim().toLowerCase(),password:password});
    if(result.error)throw result.error;
    var profileResult=await client.from("advisor_profiles")
      .select("id,organization_id,email,first_name,last_name,display_name,role,job_title,location,education,finma_registry_number,phone,street,postcode,city,active")
      .eq("auth_user_id",result.data.user.id).eq("active",true).single();
    if(profileResult.error){
      await client.auth.signOut({scope:"local"});
      throw new Error("Für dieses Login wurde kein aktives Beraterprofil gefunden.");
    }
    return{user:result.data.user,profile:profileResult.data};
  }
  async function current(){
    var userResult=await client.auth.getUser();
    if(userResult.error||!userResult.data.user)return null;
    var profileResult=await client.from("advisor_profiles")
      .select("id,organization_id,email,first_name,last_name,display_name,role,job_title,location,education,finma_registry_number,phone,street,postcode,city,active")
      .eq("auth_user_id",userResult.data.user.id).eq("active",true).single();
    if(profileResult.error)return null;
    return{user:userResult.data.user,profile:profileResult.data};
  }
  async function signOut(){await client.auth.signOut({scope:"local"});}
  global.CombinvestCloud={client:client,signIn:signIn,current:current,signOut:signOut};
})(window);
