async function handleSave() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const payload = {
    button_style: buttonStyle,
    updated_at: new Date().toISOString(),
  };

  // 1) Tenta atualizar o registro existente
  const { error: updateError } = await supabase
    .from("settings")
    .update(payload)
    .eq("user_id", user.id);

  // 2) Se não havia registro, insere um novo
  if (updateError) {
    const { error: insertError } = await supabase
      .from("settings")
      .insert({ user_id: user.id, ...payload });

    if (insertError) {
      toast.error("Erro ao salvar tema");
      return;
    }
  }

  toast.success("Tema salvo!");
  window.dispatchEvent(new Event("settings-saved"));
}