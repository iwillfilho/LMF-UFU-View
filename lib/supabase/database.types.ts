
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "access_grants": {
                  Row: {
                    "created_at": string,"email": string,"granted_by": string | null,"id": string,"member_id": string | null,"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"granted_by"?: string | null,"id"?: string,"member_id"?: string | null,"role": Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"granted_by"?: string | null,"id"?: string,"member_id"?: string | null,"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "access_grants_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"alumni_submissions": {
                  Row: {
                    "cargos": string | null,"consentimento": boolean,"created_at": string,"curso": string | null,"email": string,"foto_path": string | null,"gestao_trainee": string | null,"gestoes": string | null,"id": string,"linkedin": string | null,"member_id": string | null,"mensagem": string | null,"nome": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["submission_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "cargos"?: string | null,"consentimento": boolean,"created_at"?: string,"curso"?: string | null,"email": string,"foto_path"?: string | null,"gestao_trainee"?: string | null,"gestoes"?: string | null,"id"?: string,"linkedin"?: string | null,"member_id"?: string | null,"mensagem"?: string | null,"nome": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["submission_status"]
                  }
                  Update: {
                    "cargos"?: string | null,"consentimento"?: boolean,"created_at"?: string,"curso"?: string | null,"email"?: string,"foto_path"?: string | null,"gestao_trainee"?: string | null,"gestoes"?: string | null,"id"?: string,"linkedin"?: string | null,"member_id"?: string | null,"mensagem"?: string | null,"nome"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["submission_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "alumni_submissions_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"calendars": {
                  Row: {
                    "cor": string,"created_at": string,"google_calendar_id": string,"id": string,"nome": string,"ordem": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cor"?: string,"created_at"?: string,"google_calendar_id": string,"id"?: string,"nome": string,"ordem"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "cor"?: string,"created_at"?: string,"google_calendar_id"?: string,"id"?: string,"nome"?: string,"ordem"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"contact_messages": {
                  Row: {
                    "assunto": string | null,"created_at": string,"email": string,"id": string,"lida": boolean,"mensagem": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assunto"?: string | null,"created_at"?: string,"email": string,"id"?: string,"lida"?: boolean,"mensagem": string,"nome": string
                  }
                  Update: {
                    "assunto"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"lida"?: boolean,"mensagem"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"diretorias": {
                  Row: {
                    "created_at": string,"id": string,"nome": string,"ordem": number,"slug": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"nome": string,"ordem"?: number,"slug": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"nome"?: string,"ordem"?: number,"slug"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"documents": {
                  Row: {
                    "categoria": Database["public"]['Enums']["document_categoria"],"created_at": string,"descricao": string | null,"file_path": string,"id": string,"ordem": number,"titulo": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria": Database["public"]['Enums']["document_categoria"],"created_at"?: string,"descricao"?: string | null,"file_path": string,"id"?: string,"ordem"?: number,"titulo": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "categoria"?: Database["public"]['Enums']["document_categoria"],"created_at"?: string,"descricao"?: string | null,"file_path"?: string,"id"?: string,"ordem"?: number,"titulo"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"history_sections": {
                  Row: {
                    "conquistas": (string)[],"created_at": string,"fotos": (string)[],"id": string,"ordem": number,"periodo": string,"texto": string | null,"titulo": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "conquistas"?: (string)[],"created_at"?: string,"fotos"?: (string)[],"id"?: string,"ordem"?: number,"periodo": string,"texto"?: string | null,"titulo": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "conquistas"?: (string)[],"created_at"?: string,"fotos"?: (string)[],"id"?: string,"ordem"?: number,"periodo"?: string,"texto"?: string | null,"titulo"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"hr_records": {
                  Row: {
                    "created_at": string,"created_by": string | null,"gestao": string,"id": string,"member_id": string,"motivo": string,"tipo": Database["public"]['Enums']["hr_tipo"],"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"gestao": string,"id"?: string,"member_id": string,"motivo": string,"tipo": Database["public"]['Enums']["hr_tipo"],"valor"?: number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"gestao"?: string,"id"?: string,"member_id"?: string,"motivo"?: string,"tipo"?: Database["public"]['Enums']["hr_tipo"],"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "hr_records_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"member_private": {
                  Row: {
                    "email_contato": string | null,"member_id": string,"telefone": string | null,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "email_contato"?: string | null,"member_id": string,"telefone"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "email_contato"?: string | null,"member_id"?: string,"telefone"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_private_member_id_fkey"
      columns: ["member_id"]
isOneToOne: true
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"member_terms": {
                  Row: {
                    "cargo": string,"created_at": string,"diretoria_id": string | null,"gestao": string,"id": string,"member_id": string,"nucleo_id": string | null,"ordem": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cargo": string,"created_at"?: string,"diretoria_id"?: string | null,"gestao": string,"id"?: string,"member_id": string,"nucleo_id"?: string | null,"ordem"?: number
                  }
                  Update: {
                    "cargo"?: string,"created_at"?: string,"diretoria_id"?: string | null,"gestao"?: string,"id"?: string,"member_id"?: string,"nucleo_id"?: string | null,"ordem"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "member_terms_diretoria_id_fkey"
      columns: ["diretoria_id"]
isOneToOne: false
      referencedRelation: "diretorias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_terms_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "member_terms_nucleo_id_fkey"
      columns: ["nucleo_id"]
isOneToOne: false
      referencedRelation: "nucleos"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "anonimizado": boolean,"created_at": string,"curso": string | null,"foto_path": string | null,"gestao_trainee": string | null,"id": string,"linkedin": string | null,"nome": string,"slug": string,"status": Database["public"]['Enums']["member_status"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "anonimizado"?: boolean,"created_at"?: string,"curso"?: string | null,"foto_path"?: string | null,"gestao_trainee"?: string | null,"id"?: string,"linkedin"?: string | null,"nome": string,"slug": string,"status"?: Database["public"]['Enums']["member_status"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "anonimizado"?: boolean,"created_at"?: string,"curso"?: string | null,"foto_path"?: string | null,"gestao_trainee"?: string | null,"id"?: string,"linkedin"?: string | null,"nome"?: string,"slug"?: string,"status"?: Database["public"]['Enums']["member_status"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"nucleo_partners": {
                  Row: {
                    "nucleo_id": string,"ordem": number,"partner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "nucleo_id": string,"ordem"?: number,"partner_id": string
                  }
                  Update: {
                    "nucleo_id"?: string,"ordem"?: number,"partner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nucleo_partners_nucleo_id_fkey"
      columns: ["nucleo_id"]
isOneToOne: false
      referencedRelation: "nucleos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nucleo_partners_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["id"]
    }
                  ]
                },"nucleos": {
                  Row: {
                    "area": string | null,"banner_path": string | null,"created_at": string,"descricao": string | null,"id": string,"nome": string,"ordem": number,"slug": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area"?: string | null,"banner_path"?: string | null,"created_at"?: string,"descricao"?: string | null,"id"?: string,"nome": string,"ordem"?: number,"slug": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "area"?: string | null,"banner_path"?: string | null,"created_at"?: string,"descricao"?: string | null,"id"?: string,"nome"?: string,"ordem"?: number,"slug"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"partners": {
                  Row: {
                    "created_at": string,"id": string,"institucional": boolean,"logo_path": string | null,"nome": string,"ordem": number,"updated_at": string,"updated_by": string | null,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"institucional"?: boolean,"logo_path"?: string | null,"nome": string,"ordem"?: number,"updated_at"?: string,"updated_by"?: string | null,"url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"institucional"?: boolean,"logo_path"?: string | null,"nome"?: string,"ordem"?: number,"updated_at"?: string,"updated_by"?: string | null,"url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"posts": {
                  Row: {
                    "autor_id": string | null,"capa_path": string | null,"categoria": Database["public"]['Enums']["post_categoria"],"corpo": NonNullable<Json>,"created_at": string,"data_evento": string | null,"galeria": (string)[],"id": string,"local": string | null,"publicado": boolean,"publicado_em": string | null,"resumo": string | null,"slug": string,"titulo": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "autor_id"?: string | null,"capa_path"?: string | null,"categoria": Database["public"]['Enums']["post_categoria"],"corpo"?: NonNullable<Json>,"created_at"?: string,"data_evento"?: string | null,"galeria"?: (string)[],"id"?: string,"local"?: string | null,"publicado"?: boolean,"publicado_em"?: string | null,"resumo"?: string | null,"slug": string,"titulo": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "autor_id"?: string | null,"capa_path"?: string | null,"categoria"?: Database["public"]['Enums']["post_categoria"],"corpo"?: NonNullable<Json>,"created_at"?: string,"data_evento"?: string | null,"galeria"?: (string)[],"id"?: string,"local"?: string | null,"publicado"?: boolean,"publicado_em"?: string | null,"resumo"?: string | null,"slug"?: string,"titulo"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"ps_steps": {
                  Row: {
                    "created_at": string,"descricao": string | null,"id": string,"ordem": number,"titulo": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"descricao"?: string | null,"id"?: string,"ordem"?: number,"titulo": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"descricao"?: string | null,"id"?: string,"ordem"?: number,"titulo"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"report_authors": {
                  Row: {
                    "member_id": string,"ordem": number,"report_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "member_id": string,"ordem"?: number,"report_id": string
                  }
                  Update: {
                    "member_id"?: string,"ordem"?: number,"report_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_authors_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "report_authors_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"id": string,"nucleo_id": string | null,"pdf_path": string | null,"publicado": boolean,"publicado_em": string | null,"resumo": string | null,"setor": string | null,"slug": string,"ticker": string | null,"tipo": Database["public"]['Enums']["report_tipo"],"titulo": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"nucleo_id"?: string | null,"pdf_path"?: string | null,"publicado"?: boolean,"publicado_em"?: string | null,"resumo"?: string | null,"setor"?: string | null,"slug": string,"ticker"?: string | null,"tipo": Database["public"]['Enums']["report_tipo"],"titulo": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"nucleo_id"?: string | null,"pdf_path"?: string | null,"publicado"?: boolean,"publicado_em"?: string | null,"resumo"?: string | null,"setor"?: string | null,"slug"?: string,"ticker"?: string | null,"tipo"?: Database["public"]['Enums']["report_tipo"],"titulo"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_nucleo_id_fkey"
      columns: ["nucleo_id"]
isOneToOne: false
      referencedRelation: "nucleos"
      referencedColumns: ["id"]
    }
                  ]
                },"restricted_settings": {
                  Row: {
                    "drive_url": string | null,"id": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "drive_url"?: string | null,"id"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "drive_url"?: string | null,"id"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"site_settings": {
                  Row: {
                    "edital_pdf_path": string | null,"forms_url": string | null,"id": boolean,"ps_aberto": boolean,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "edital_pdf_path"?: string | null,"forms_url"?: string | null,"id"?: boolean,"ps_aberto"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "edital_pdf_path"?: string | null,"forms_url"?: string | null,"id"?: boolean,"ps_aberto"?: boolean,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"grant_id": string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"grant_id": string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"grant_id"?: string,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_grant_id_fkey"
      columns: ["grant_id"]
isOneToOne: false
      referencedRelation: "access_grants"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "app_role": "presidente"|"diretor_rh"|"rh"|"editor"|"membro","document_categoria": "estatuto"|"regimento"|"auxiliar","hr_tipo": "ponto"|"strike","member_status": "ativo"|"alumni","post_categoria": "evento"|"palestra"|"viagem"|"smf"|"competicao","report_tipo": "tese"|"iniciacao","submission_status": "pendente"|"aprovado"|"rejeitado"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["presidente", "diretor_rh", "rh", "editor", "membro"],"document_categoria": ["estatuto", "regimento", "auxiliar"],"hr_tipo": ["ponto", "strike"],"member_status": ["ativo", "alumni"],"post_categoria": ["evento", "palestra", "viagem", "smf", "competicao"],"report_tipo": ["tese", "iniciacao"],"submission_status": ["pendente", "aprovado", "rejeitado"]
          }
        }
} as const
