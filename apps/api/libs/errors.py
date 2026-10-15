"""
Erreurs métier de l'API (D4, SPEC-TECHNIQUE §7.1).

Une vue lève `ApiError("CODE")` : le gestionnaire d'erreurs (`libs.exception_handler`) la rend au format unique
`{code, message, fields?}`, avec le message français du catalogue. Le front s'appuie sur le `code`, stable ; le
`message` est affichable tel quel.

Les messages sont impersonnels, ou au tutoiement quand seul l'apprenant peut les recevoir (§4.5).
"""

from rest_framework import status
from rest_framework.exceptions import APIException

S = status

#: Code → (statut HTTP, message français).
CATALOG: dict[str, tuple[int, str]] = {
    # --- Génériques -------------------------------------------------------------------------
    "VALIDATION_ERROR": (S.HTTP_400_BAD_REQUEST, "Certaines informations sont invalides."),
    "PARSE_ERROR": (S.HTTP_400_BAD_REQUEST, "La requête est mal formée."),
    "NOT_AUTHENTICATED": (S.HTTP_401_UNAUTHORIZED, "Connexion requise."),
    "PERMISSION_DENIED": (S.HTTP_403_FORBIDDEN, "Action non autorisée."),
    "NOT_FOUND": (S.HTTP_404_NOT_FOUND, "Élément non trouvé."),
    "METHOD_NOT_ALLOWED": (S.HTTP_405_METHOD_NOT_ALLOWED, "Méthode non autorisée."),
    "NOT_ACCEPTABLE": (S.HTTP_406_NOT_ACCEPTABLE, "Format de réponse non disponible."),
    "UNSUPPORTED_MEDIA_TYPE": (
        S.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        "Format de requête non pris en charge.",
    ),
    "THROTTLED": (
        S.HTTP_429_TOO_MANY_REQUESTS,
        "Trop de tentatives. Réessayez dans quelques instants.",
    ),
    "SERVER_ERROR": (
        S.HTTP_500_INTERNAL_SERVER_ERROR,
        "Une erreur est survenue. Réessayez dans quelques instants.",
    ),
    # --- Auth -------------------------------------------------------------------------------
    "INVALID_CREDENTIALS": (S.HTTP_400_BAD_REQUEST, "Identifiant ou mot de passe incorrect."),
    "ACCOUNT_PENDING_CONSENT": (
        S.HTTP_403_FORBIDDEN,
        "Ton inscription attend encore l'accord de ton parent.",
    ),
    "ACCOUNT_SUSPENDED": (
        S.HTTP_403_FORBIDDEN,
        "Ce compte est suspendu. Contactez l'équipe Steamy.",
    ),
    "ACCOUNT_DEACTIVATED": (S.HTTP_403_FORBIDDEN, "Ce compte est désactivé."),
    "USERNAME_TAKEN": (S.HTTP_409_CONFLICT, "Cet identifiant est déjà associé à un compte Steamy."),
    "USERNAME_INVALID": (
        S.HTTP_400_BAD_REQUEST,
        "L'identifiant doit faire 3 à 30 caractères (lettres, chiffres, « . », « _ » ou « - ») "
        "et contenir au moins une lettre.",
    ),
    "PHONE_TAKEN": (S.HTTP_409_CONFLICT, "Ce numéro est déjà associé à un compte Steamy."),
    "EMAIL_TAKEN": (S.HTTP_409_CONFLICT, "Cette adresse email est déjà utilisée."),
    "PHONE_INVALID": (S.HTTP_400_BAD_REQUEST, "Ce numéro de téléphone n'est pas valide."),
    "PASSWORD_TOO_WEAK": (
        S.HTTP_400_BAD_REQUEST,
        "Le mot de passe doit faire au moins 8 caractères, avec au moins une lettre et un chiffre.",
    ),
    "AGE_OUT_OF_RANGE": (S.HTTP_400_BAD_REQUEST, "Steamy est réservé aux 10-17 ans."),
    "OTP_INVALID": (S.HTTP_400_BAD_REQUEST, "Code incorrect."),
    "OTP_EXPIRED": (S.HTTP_400_BAD_REQUEST, "Ce code a expiré. Demandez-en un nouveau."),
    "OTP_TOO_MANY_ATTEMPTS": (
        S.HTTP_429_TOO_MANY_REQUESTS,
        "Trop d'essais pour ce code. Demandez-en un nouveau.",
    ),
    "OTP_RESEND_TOO_EARLY": (
        S.HTTP_429_TOO_MANY_REQUESTS,
        "Patientez avant de demander un nouveau code.",
    ),
    "OTP_DAILY_LIMIT": (
        S.HTTP_429_TOO_MANY_REQUESTS,
        "Nombre maximal de codes atteint pour aujourd'hui. Réessayez demain.",
    ),
    "RESUME_CODE_INVALID": (S.HTTP_400_BAD_REQUEST, "Identifiant ou code de reprise incorrect."),
    "SIGNUP_EXPIRED": (
        S.HTTP_410_GONE,
        "Cette inscription a expiré. Tu peux recommencer depuis le début.",
    ),
    "INVITATION_INVALID": (S.HTTP_400_BAD_REQUEST, "Ce lien d'invitation n'est plus valide."),
    "PASSWORD_RESET_BY_PARENT": (
        S.HTTP_400_BAD_REQUEST,
        "Demande à ton parent : il peut changer ton mot de passe depuis son espace Steamy.",
    ),
    "RESET_TOKEN_INVALID": (
        S.HTTP_400_BAD_REQUEST,
        "Cette réinitialisation a expiré. Recommencez depuis « Mot de passe oublié ».",
    ),
    "OTP_REQUIRED": (S.HTTP_403_FORBIDDEN, "Validation en deux étapes requise."),
    # --- Comptes ----------------------------------------------------------------------------
    "CONSENT_REQUEST_EXPIRED": (S.HTTP_410_GONE, "Cette demande a expiré."),
    "CONSENT_ALREADY_RESOLVED": (S.HTTP_409_CONFLICT, "Cette demande a déjà été traitée."),
    "CONSENT_COOLDOWN": (
        S.HTTP_409_CONFLICT,
        "Une demande a été refusée par ce parent il y a moins de 30 jours.",
    ),
    "CONSENT_PHONE_MISMATCH": (
        S.HTTP_403_FORBIDDEN,
        "Cette demande est adressée à un autre numéro de téléphone.",
    ),
    "CHILDREN_STILL_LINKED": (
        S.HTTP_409_CONFLICT,
        "Supprimez ou transférez d'abord les comptes de vos enfants.",
    ),
    "BIRTHDATE_AGE_MISMATCH": (
        S.HTTP_400_BAD_REQUEST,
        "La date de naissance ne correspond pas à l'âge indiqué à l'inscription.",
    ),
    # --- Pédagogie --------------------------------------------------------------------------
    "PAYMENT_REQUIRED": (
        S.HTTP_402_PAYMENT_REQUIRED,
        "Ce parcours est payant : il doit être acheté avant l'inscription.",
    ),
    "KIT_CODE_REQUIRED": (
        S.HTTP_402_PAYMENT_REQUIRED,
        "Ce parcours s'ouvre avec le code fourni dans son kit.",
    ),
    "CONTENT_LOCKED": (S.HTTP_403_FORBIDDEN, "Termine d'abord les étapes précédentes."),
    "NOT_ENROLLED": (S.HTTP_403_FORBIDDEN, "Inscris-toi d'abord à ce parcours."),
    "PDF_NOT_READY": (
        S.HTTP_409_CONFLICT,
        "Le document est en cours de préparation. Réessaie dans quelques instants.",
    ),
    "QUIZ_COOLDOWN": (
        S.HTTP_429_TOO_MANY_REQUESTS,
        "Revois les missions conseillées : tu pourras réessayer dans quelques minutes.",
    ),
    # --- Commerce ---------------------------------------------------------------------------
    "PARENT_APPROVAL_REQUIRED": (
        S.HTTP_403_FORBIDDEN,
        "Demande à ton parent : c'est lui qui valide et qui paie.",
    ),
    "KIT_CODE_INVALID": (S.HTTP_400_BAD_REQUEST, "Ce code de kit n'existe pas."),
    "KIT_CODE_ALREADY_USED": (S.HTTP_409_CONFLICT, "Ce code de kit a déjà été utilisé."),
    "KIT_CODE_NOT_COMPATIBLE": (
        S.HTTP_400_BAD_REQUEST,
        "Ce code de kit n'ouvre pas ce parcours.",
    ),
    "OUT_OF_STOCK": (S.HTTP_409_CONFLICT, "Ce kit n'est plus disponible en quantité suffisante."),
    "DELIVERY_ZONE_UNAVAILABLE": (
        S.HTTP_400_BAD_REQUEST,
        "La livraison n'est pas disponible à cette adresse.",
    ),
    "NETWORK_UNAVAILABLE": (
        S.HTTP_400_BAD_REQUEST,
        "Ce réseau Mobile Money n'est pas disponible pour ce pays.",
    ),
    "ORDER_EXPIRED": (S.HTTP_410_GONE, "Cette commande a expiré."),
    "ORDER_ALREADY_PAID": (S.HTTP_409_CONFLICT, "Cette commande est déjà payée."),
    "PAYMENT_FAILED": (S.HTTP_402_PAYMENT_REQUIRED, "Le paiement n'a pas abouti."),
    # --- Événements, classes, pilotage ------------------------------------------------------
    "EVENT_FULL": (S.HTTP_409_CONFLICT, "Cet événement est complet."),
    "EVENT_CLOSED": (S.HTTP_409_CONFLICT, "Les candidatures à cet événement sont closes."),
    "ALREADY_APPLIED": (S.HTTP_409_CONFLICT, "Une candidature existe déjà pour cet événement."),
    "EVENT_ALREADY_PROPOSED": (
        S.HTTP_409_CONFLICT,
        "Cet événement a déjà été proposé à cette classe.",
    ),
    "CLASSROOM_QUOTA_EXCEEDED": (
        S.HTTP_409_CONFLICT,
        "Le nombre maximal de classes de votre offre est atteint.",
    ),
    "LEARNER_QUOTA_EXCEEDED": (
        S.HTTP_409_CONFLICT,
        "Le nombre maximal d'élèves de votre offre est atteint.",
    ),
    "COURSE_NOT_IN_OFFER": (
        S.HTTP_400_BAD_REQUEST,
        "Ce parcours ne fait pas partie de votre offre.",
    ),
    "CLASSROOM_NAME_TAKEN": (S.HTTP_409_CONFLICT, "Une de vos classes porte déjà ce nom."),
    "INVITATION_DAILY_LIMIT": (
        S.HTTP_429_TOO_MANY_REQUESTS,
        "Nombre maximal d'invitations atteint pour aujourd'hui. Réessayez demain.",
    ),
    "REPORT_LOCKED": (S.HTTP_409_CONFLICT, "Ce rapport est soumis : il n'est plus modifiable."),
    # --- Import d'élèves (codes par ligne, C19) ---------------------------------------------
    "DUPLICATE_ROW": (S.HTTP_400_BAD_REQUEST, "Ligne en double dans le fichier."),
    "MALFORMED_ROW": (S.HTTP_400_BAD_REQUEST, "Ligne incomplète ou mal formée."),
    "ALREADY_IN_CLASSROOM": (S.HTTP_409_CONFLICT, "Cet élève est déjà dans la classe."),
    "IMPORT_TOO_LARGE": (
        S.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        "Le fichier dépasse 200 lignes : découpez-le en plusieurs imports.",
    ),
    "IMPORT_INVALID_FILE": (
        S.HTTP_400_BAD_REQUEST,
        "Fichier illisible : envoyez un fichier CSV ou Excel (.xlsx).",
    ),
}


def message_for(code: str) -> str:
    return CATALOG[code][1]


class ApiError(APIException):
    """
    Erreur métier identifiée par un code du catalogue. `fields` (facultatif) rattache l'erreur à des champs :
    `ApiError("USERNAME_TAKEN", fields={"username": "USERNAME_TAKEN"})`.
    """

    def __init__(
        self,
        code: str,
        message: str | None = None,
        *,
        fields: dict[str, str] | None = None,
        status_code: int | None = None,
    ):
        default_status, default_message = CATALOG[code]
        self.status_code = status_code or default_status
        super().__init__(detail=message or default_message, code=code)
        self.default_code = code
        #: Champ → code du catalogue
        self.fields = fields or {}


#: Codes du catalogue, triés (énumération `ErrorCodeEnum` du schéma OpenAPI).
ERROR_CODES = sorted(CATALOG)
