# Gimlet Dashboard

## Gitpod vars


What to store SSH key in $GITHUB_PRIVATE_KEY

```
sed -z 's/\n/\\n/g' my_ssh_key | base64 -w 0
```

Then gitpod will decode it with `base64 -d`
