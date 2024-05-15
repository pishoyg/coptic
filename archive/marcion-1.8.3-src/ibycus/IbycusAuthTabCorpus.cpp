#include "IbycusAuthTabCorpus.h"

__IBYCUS_BEGIN_NAMESPACE

ibyAuthTabCorpus::ibyAuthTabCorpus(ibyFile & src, ibylen_t len, ibystring_t tag) throw(IbycusParseException)
        : tag_(tag.substr(tag.find_first_not_of("*")))
{
        len--;
        ibyFile::pos_type start_pos = src.tellg();
        unsigned char delim;
        src >> name_;
        ibyAuthTabAuthor auth;
        ibystring_t id, name, tmp;
        bool first = true;

        while ((ibyFile::pos_type)len > ((ibyFile::pos_type)src.tellg() - start_pos)) {
                delim = src.get();
                switch (delim) {
                case AT_DELIM_AUTH:
                        src >> id;

                        if (id.length() > 0) {
                                name = id.substr(8);
                                id = id.substr(0,7);

                                if (first) {
                                        first = false;
                                } else {
                                        authlist_.push_back(auth);
                                }

                                auth = ibyAuthTabAuthor(id, name);

                        }
                        break;
                case AT_DELIM_UNKNOWN:
                        // What is this field for?
                        src >> tmp;
                        break;
                case AT_DELIM_REMARKS:
                        src >> tmp;
                        auth.SetComment(tmp);
                        break;
                case AT_DELIM_ALPHABET:
                        auth.SetAlphabet(src.get());
                        break;
                case AT_DELIM_ALIAS:
                        src >> tmp;
                        if (tmp.length() > 0)
                                auth.AddAlias(tmp);
                        break;
                default:
                        char tmp2[500];
                        unsigned int errpos = src.tellg();
                        sprintf(tmp2, "Error reading AUTHTAB.DIR. Unexpected value (%X) at file offset %X", delim, errpos);
                        throw IbycusParseException(tmp2, errpos);
                }

        }
        authlist_.push_back(auth);
        src.get(); // Eat final delimiter
}

const ibystring_t & ibyAuthTabCorpus::Name(int author) const throw(IbycusException)
{
        try {
                return authlist_[author].Name();
        } catch(out_of_range E) {
                throw IbycusException("No author with the index");
        }
}

const ibystring_t & ibyAuthTabCorpus::Id(int author) const throw(IbycusException)
{
        try {
                return authlist_[author].Id();
        } catch(out_of_range E) {
                throw IbycusException("No author with the index");
        }
}

int ibyAuthTabCorpus::AliasCount(int author) const throw(IbycusException)
{
        try {
                return authlist_[author].AliasCount();
        } catch(out_of_range E) {
                throw IbycusException("No author with the index");
        }
}

const ibystring_t & ibyAuthTabCorpus::Alias(int author, int alias) const throw(IbycusException)
{
        try {
                return authlist_[author].Alias(alias);
        } catch(out_of_range E) {
                throw IbycusException("No author with the index");
        }
}

__IBYCUS_END_NAMESPACE
