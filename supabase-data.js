(function(global){
  "use strict";
  var cloud=global.CombinvestCloud;
  if(!cloud)throw new Error("Supabase Auth fehlt.");
  var client=cloud.client;

  async function context(){
    var auth=await cloud.current();
    if(!auth)throw new Error("Nicht angemeldet.");
    return auth;
  }
  async function dashboard(){
    var auth=await context(),advisorId=auth.profile.id;
    var results=await Promise.all([
      client.from("customers").select("id,first_name,last_name,birthdate,email,phone,postcode,city,created_at,updated_at").neq("status","archived").order("updated_at",{ascending:false}),
      client.from("analyses").select("id,customer_id,status,current_step,current_question,progress_percent,created_at,updated_at,completed_at").neq("status","cancelled").order("updated_at",{ascending:false}),
      client.from("appointments").select("id,customer_id,title,appointment_type,starts_at,ends_at,status,location").eq("advisor_id",advisorId).order("starts_at",{ascending:true})
    ]);
    results.forEach(function(r){if(r.error)throw r.error;});
    return{auth:auth,customers:results[0].data||[],analyses:results[1].data||[],appointments:results[2].data||[]};
  }
  async function createCustomerAndAnalysis(input){
    var result=await client.rpc("create_customer_with_analysis",{
      p_first_name:input.firstName,p_last_name:input.lastName,p_birthdate:input.birthdate||null,
      p_email:input.email||null,p_phone:input.phone||null,p_postcode:input.postcode||null,p_city:input.city||null
    });
    if(result.error)throw result.error;
    return result.data[0];
  }
  async function startAnalysis(customerId){
    var result=await client.rpc("start_customer_analysis",{p_customer_id:customerId});
    if(result.error)throw result.error;
    return result.data;
  }
  async function customer(customerId){
    var results=await Promise.all([
      client.from("customers").select("*").eq("id",customerId).single(),
      client.from("analyses").select("*").eq("customer_id",customerId).order("updated_at",{ascending:false}),
      client.from("contracts").select("*").eq("customer_id",customerId).order("updated_at",{ascending:false})
    ]);
    results.forEach(function(r){if(r.error)throw r.error;});
    return{customer:results[0].data,analyses:results[1].data||[],contracts:results[2].data||[]};
  }
  async function analysis(analysisId){
    var result=await client.from("analyses").select("*").eq("id",analysisId).single();
    if(result.error)throw result.error;
    return result.data;
  }
  async function saveAnalysis(analysisId,expectedVersion,step,question,progress,snapshot,complete){
    var result=await client.rpc("save_analysis_snapshot",{
      p_analysis_id:analysisId,p_expected_lock_version:expectedVersion,p_step:step,
      p_question:question,p_progress:progress,p_snapshot:snapshot,p_complete:!!complete
    });
    if(result.error)throw result.error;
    return result.data;
  }
  global.CombinvestData={dashboard:dashboard,createCustomerAndAnalysis:createCustomerAndAnalysis,startAnalysis:startAnalysis,customer:customer,analysis:analysis,saveAnalysis:saveAnalysis};
})(window);
