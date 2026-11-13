import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ status: z.enum(["new","researching","qualified","excluded","demo_pending","demo_ready","approved","contacted","interested","meeting","quoted","won","lost"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok:false, error:"Invalid lead status." }, { status:400 });
    const supabase = await createClient();
    const { data:{ user }, error:authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ ok:false, error:"Please sign in again." }, { status:401 });
    const { data, error } = await supabase.from("leads").update({ status:parsed.data.status }).eq("id",id).eq("owner_id",user.id).select("id,status").single();
    if (error || !data) return NextResponse.json({ ok:false, error:error?.message||"Lead not found." }, { status:404 });
    return NextResponse.json({ ok:true, lead:data });
  } catch(e) {
    return NextResponse.json({ ok:false, error:e instanceof Error?e.message:"Unexpected error." }, { status:500 });
  }
}
