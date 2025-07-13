import { createClient } from 'npm:@supabase/supabase-js'
import { verifyWebhook } from 'npm:@clerk/backend/webhooks'

Deno.serve(async (req: Request) => {
  // Verify webhook signature
  const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET')

  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  const event = await verifyWebhook(req, { signingSecret: webhookSecret })

  // Create supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response('Supabase credentials not configured', { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Handle user creation
  const { data: user, error } = await supabase
  .from('users')
  .insert([
    {
      id: event.data.id,
      first_name: event.data.first_name,
      last_name: event.data.last_name,
      username: event.data.username,
      email: event.data.email_addresses[0].email_address,
      birth_date: event.data.birthday,
      profile_picture: event.data.image_url,
    },
  ])
  .select()
  .single()

  if (error) {
    console.error('Error creating user:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ user }), { status: 200 })
})