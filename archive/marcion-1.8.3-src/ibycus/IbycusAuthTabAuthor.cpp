#include "IbycusAuthTabAuthor.h"

__IBYCUS_BEGIN_NAMESPACE

ibystring_t ibyAuthTabAuthor::alphabetize(ibystring_t & src)
{
        ibystring_t tmp = src;
        ibystring_t tmp2;
        ibystring_t::size_type  m,n;
        if ((m = src.find("&1")) != src.npos) {
                if ((n = src.find("&",m+2)) != src.npos) {
                        tmp = src.substr(m+2, n-m-2) + src.substr(n+1);
                        tmp2 = src.substr(0, m);
                        if (!tmp2.empty()) {
                                tmp += ", " + tmp2.substr(0, tmp2.find_last_of(" "));
                        }
                }
        }
        return tmp;
}

const ibystring_t & ibyAuthTabAuthor::Alias(int alias) const throw(IbycusException)
{
        try {
                return aliases_[alias];
        } catch(out_of_range E) {
                throw IbycusException("No alias with the index");
        }
}

__IBYCUS_END_NAMESPACE
