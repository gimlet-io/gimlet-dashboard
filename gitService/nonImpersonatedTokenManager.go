package gitService

type NonImpersonatedTokenManager interface {
	Token() (string, string, error)
}
