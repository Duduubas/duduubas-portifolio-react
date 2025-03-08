"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect, useCallback, Suspense } from "react";
import { AlertTriangle } from "lucide-react";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Digite seu nome completo."),
  email: z.string().trim().email("Digite um e-mail válido."),
  number: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Digite um número válido."),
  message: z.string().trim().min(5, "A mensagem deve ter pelo menos 5 caracteres."),
});

type ContactFormData = z.infer<typeof contactSchema>;

// Componente de fallback simples enquanto a página carrega
function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="w-full max-w-lg bg-cards p-6 rounded-xl shadow-lg flex justify-center">
        <div className="custom-loader" />
      </div>
    </div>
  );
}

function ContactForm() {
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    reset, 
    setValue 
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    mode: "onBlur",
  });  

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);

  // Optimize phone number formatting with useCallback
  const formatPhoneNumber = useCallback((input: string) => {
    const digits = input.replace(/\D/g, "");

    if (digits.length >= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    if (digits.length >= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
    if (digits.length >= 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    
    return digits;
  }, []);

  // Use a dois estágios de carregamento para garantir dimensões estáveis
  useEffect(() => {
    // Primeiro, garantimos que a estrutura básica esteja presente (sem transição)
    setIsLoaded(true);
    
    // Depois, adicionamos um atraso maior para garantir que tudo esteja calculado corretamente
    // antes de mostrar o conteúdo com a transição de opacidade
    const timer = setTimeout(() => {
      setIsContentVisible(true);
    }, 500); // Tempo aumentado para 500ms
    
    return () => clearTimeout(timer);
  }, []);

  // Optimize submit handler
  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      setStatus(response.ok ? "success" : "error");
      if (response.ok) {
        reset();
      }
    } catch (error) {
      console.error("Submission error:", error);
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Memoize input configuration to prevent unnecessary re-renders
  const inputConfigs = [
    { 
      label: "Nome *", 
      name: "name", 
      type: "text", 
      placeholder: "Buzz Lightyear" 
    },
    { 
      label: "E-mail *", 
      name: "email", 
      type: "email", 
      placeholder: "example@domain.com" 
    },
    { 
      label: "WhatsApp *", 
      name: "number", 
      type: "tel", 
      placeholder: "(99) 99999-9999", 
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => 
        setValue("number", formatPhoneNumber(e.target.value)) 
    }
  ];

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen px-4 bg-black"
      style={{ 
        visibility: isLoaded ? 'visible' : 'hidden',
        opacity: isContentVisible ? 1 : 0,
        transition: 'opacity 500ms ease-in-out'
      }}
    >
      <h2 className="text-[1.5rem] md:text-3xl font-semibold font-heading text-white mb-6">
        Entre em contato
      </h2>
      
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        noValidate 
        className="w-full max-w-lg bg-cards p-6 rounded-xl shadow-lg"
      >
        {inputConfigs.map(({ label, name, type, placeholder, onBlur }) => (
          <label key={name} className="block mb-4">
            <span className="text-white">{label}</span>
            <input
              type={type}
              {...register(name as keyof ContactFormData)}
              placeholder={placeholder}
              className="
                w-full mt-1 p-2 bg-cards text-white 
                border border-gray rounded-xl
              "
              onBlur={onBlur}
            />
            {errors[name as keyof ContactFormData] && (
              <div 
                className="
                  mt-2 flex items-center gap-2 
                  p-2 text-danger border border-danger 
                  rounded-xl text-sm
                "
              >
                <AlertTriangle size={16} />
                {errors[name as keyof ContactFormData]?.message}
              </div>
            )}
          </label>
        ))}

        <label className="block mb-4">
          <span className="text-white">Mensagem *</span>
          <textarea
            {...register("message")}
            placeholder="Olá! Tudo bem? Gostaria de um orçamento..."
            className="
              w-full mt-1 p-2 bg-cards text-white 
              border border-gray rounded-xl h-28
            "
          />
          {errors.message && (
            <div 
              className="
                mt-2 flex items-center gap-2 
                p-2 text-danger border border-danger 
                rounded-xl text-sm
              "
            >
              <AlertTriangle size={16} />
              {errors.message.message}
            </div>
          )}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full py-2 bg-blue text-black 
            font-bold rounded-xl 
            hover:opacity-90 transition
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isSubmitting ? "Enviando..." : "Enviar"}
        </button>

        {status && (
          <p 
            className={`
              mt-4 text-center 
              ${status === "success" ? "text-success" : "text-danger"}
            `}
          >
            {status === "success" 
              ? "Mensagem enviada com sucesso!" 
              : "Erro ao enviar. Tente novamente."}
          </p>
        )}
      </form>
    </div>
  );
}

export default function Contact() {
  // Usando Suspense para lidar com o carregamento
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ContactForm />
    </Suspense>
  );
}